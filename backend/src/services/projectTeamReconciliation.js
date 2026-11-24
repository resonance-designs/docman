import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Team from '../models/Team.js';
import Doc from '../models/Doc.js';

const ids = values => [...new Set(values.map(value => String(value?._id || value)))];
export function projectTeamUpdate(teams, previous = []) {
    return {
        $set: { teams, teamSyncPending: true },
        $inc: { teamSyncRevision: 1 },
        $addToSet: { teamSyncCandidates: { $each: ids([...previous, ...teams]) } },
    };
}

// Project.teams is canonical. The pending marker/revision commits in the same
// document write as its teams, so process death cannot lose reconciliation work.
// Every touched Team retains a revision fence, including removed links. Older
// workers can finish late, but cannot overwrite a newer worker's decision.
export async function reconcileProjectTeams(projectId) {
    const _id = new mongoose.Types.ObjectId(String(projectId));
    const project = await Project.collection.findOne({ _id });
    if (!project || !project.teamSyncPending) return true;
    const revision = project.teamSyncRevision;
    if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Invalid project relationship revision');
    const desired = project.teamSyncDeleting ? [] : (project.teams || []);
    const linked = await Team.collection.find({ projects: _id }, { projection: { _id: 1 } }).toArray();
    const candidates = ids([...(project.teamSyncCandidates || []), ...(project.teams || []), ...linked.map(row => row._id)]);
    const selected = new Set(ids(desired));
    const fence = `projectSyncRevisions.${_id}`;
    for (const include of [false, true]) {
        const targets = candidates.filter(id => selected.has(id) === include).map(id => new mongoose.Types.ObjectId(id));
        if (!targets.length) continue;
        for (const teamId of targets) {
            // Use the model writer so existing Team resource-change notices run.
            const result = await Team.updateOne({
                _id: teamId,
                $or: [{ [fence]: { $exists: false } }, { [fence]: { $lte: revision } }],
            }, {
                $set: { [fence]: revision, ...(project.teamSyncActor ? { lastUpdatedBy: project.teamSyncActor } : {}) },
                [include ? '$addToSet' : '$pull']: { projects: _id },
            });
            if (!result.acknowledged) throw new Error('Team reconciliation was not acknowledged');
        }
    }
    if (project.teamSyncDeleting) {
        await Doc.updateMany({ projects: _id }, { $pull: { projects: _id } });
        const removed = await Project.collection.deleteOne({ _id, teamSyncRevision: revision, teamSyncDeleting: true });
        return removed.deletedCount === 1;
    }
    const cleared = await Project.collection.updateOne({ _id, teamSyncRevision: revision, teamSyncPending: true }, { $set: { teamSyncPending: false } });
    return cleared.matchedCount === 1;
}

export async function tryReconcileProjectTeams(projectId) {
    try { return await reconcileProjectTeams(projectId); }
    catch (error) {
        console.error('Project team reconciliation pending:', String(projectId), error?.name || 'Error');
        return false;
    }
}

const scanPosition = { after: null };
export async function reconcilePendingProjectTeams(position = scanPosition) {
    const filter = { teamSyncPending: true, ...(position.after ? { _id: { $gt: position.after } } : {}) };
    const pending = Project.collection.find(filter, { projection: { _id: 1 } }).sort({ _id: 1 }).limit(100);
    let processed = 0;
    for await (const project of pending) {
        // Advance even on failure; wrap after reaching the end to retry older work.
        position.after = project._id;
        processed++;
        await tryReconcileProjectTeams(project._id);
    }
    if (processed < 100) position.after = null;
}

export function startProjectTeamReconciliationWorker() {
    let running = false;
    const tick = async () => {
        if (running) return;
        running = true;
        try { await reconcilePendingProjectTeams(); }
        catch (error) { console.error('Project team reconciliation scan failed:', error?.name || 'Error'); }
        finally { running = false; }
    };
    const timer = setInterval(tick, 15000);
    timer.unref();
    void tick();
    return () => clearInterval(timer);
}
