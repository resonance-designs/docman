import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { existsSync } from 'node:fs';
import Notification from '../models/Notification.js';
import SystemSetting from '../models/SystemSetting.js';
import User from '../models/User.js';
import { updaterRequest } from './softwareUpdateService.js';

const execute = promisify(execFile);
const stableVersion = /^\d+\.\d+\.\d+$/;
const commitId = /^[a-f0-9]{40}$/;

// Read the immutable installed commit, not a request-supplied path or remote content.
export async function installedRelease(root) {
    const git = async (...args) => (await execute('git', ['-c', `safe.directory=${root}`, '-C', root, ...args], { timeout: 10000, maxBuffer: 2_000_000 })).stdout.trim();
    const commit = await git('rev-parse', 'HEAD');
    if (!commitId.test(commit)) throw new Error('Invalid installed commit');
    const { version } = JSON.parse(await git('show', `${commit}:package.json`));
    const changelog = await git('show', `${commit}:CHANGELOG.md`);
    return { commit, version, changelog };
}

export function releaseDetails(version, changelog) {
    const sections = String(changelog).split(/^##\s+/m);
    const section = sections.find(text => text.startsWith(`[${version}]`) || text.startsWith(`[v${version}]`));
    const details = section?.split('\n').slice(1).join('\n').trim();
    // Plain text in both channels; never render release notes as HTML.
    return details ? details.slice(0, 12000) + (details.length > 12000 ? '\n[Release notes truncated; see the release changelog for more.]' : '')
        : 'This release did not include detailed changelog notes. Contact your administrator for details.';
}

export async function queueCompletedUpdate(state, installed) {
    const runId = state?.report?.run_id;
    if (state?.status !== 'complete' || !/^[a-zA-Z0-9-]{1,100}$/.test(runId || '') ||
        !commitId.test(installed?.commit || '') || !stableVersion.test(installed?.version || '') ||
        state.report.target_commit !== installed.commit || state.commit !== installed.commit || state.tag !== `v${installed.version}`) return false;

    const key = `notifications.update.${runId}`;
    // Persist the cutoff before fan-out. Retries do not notify accounts created later.
    let receipt;
    try {
        receipt = await SystemSetting.findOneAndUpdate({ key }, { $setOnInsert: { value: {
            commit: installed.commit, cutoff: new Date().toISOString(), complete: false,
            title: `DocMan updated to ${installed.version}`,
            message: `DocMan has been updated to version ${installed.version}.\n\nWhat changed in this release:\n${releaseDetails(installed.version, installed.changelog)}\n\nContact your administrator if you encounter a problem.`,
        } } }, { upsert: true, new: true }).lean();
    } catch (error) {
        if (error?.code !== 11000) throw error;
        receipt = await SystemSetting.findOne({ key }).lean();
    }
    if (!receipt || receipt.value.commit !== installed.commit) throw new Error('Invalid update notification receipt');
    await deliverUpdateReceipt(receipt);
    return true;
}

async function deliverUpdateReceipt(receipt) {
    if (receipt.value.complete) return true;
    const runId = receipt.key.slice('notifications.update.'.length);
    const users = User.find({ isActive: { $ne: false }, invitationPending: { $ne: true }, createdAt: { $lte: new Date(receipt.value.cutoff) } }).select('_id').lean().cursor();
    for await (const user of users) {
        const eventKey = `system-update:${runId}:${user._id}`;
        try {
            await Notification.updateOne({ eventKey }, { $setOnInsert: {
                eventKey, recipient: user._id, type: 'system_updated', title: receipt.value.title,
                message: receipt.value.message, emailStatus: 'pending', emailNextAttempt: new Date(),
            } }, { upsert: true, setDefaultsOnInsert: true });
        } catch (error) {
            if (error?.code !== 11000) throw error;
            if (!await Notification.exists({ eventKey })) throw error;
        }
    }
    await SystemSetting.updateOne({ key: receipt.key }, { $set: { 'value.complete': true } });
}

export async function resumeUpdateNotifications() {
    // A newer deployment may replace the helper's last status while a prior
    // fan-out is incomplete. Its persisted receipt remains independently retryable.
    const receipts = await SystemSetting.find({ key: /^notifications\.update\./, 'value.complete': false }).sort({ createdAt: 1 }).limit(10).lean();
    for (const receipt of receipts) await deliverUpdateReceipt(receipt);
}

// Independent of browser polling and email delivery. Refresh the installed helper
// when deploying this feature to enable its read-only completion endpoint.
export function startSystemUpdateNotificationWorker(root = path.resolve(path.dirname(process.argv[1]), '../..')) {
    let running = false, installed;
    const tick = async () => {
        if (running) return;
        running = true;
        try {
            await resumeUpdateNotifications();
            if (!existsSync('/run/docman-web-updater/control.sock')) return;
            installed ||= await installedRelease(root);
            const state = await updaterRequest({ action: 'notification-status' }, 5000);
            await queueCompletedUpdate(state, installed);
        } catch (error) { console.error('System update notification scan failed:', error?.name || 'Error'); }
        finally { running = false; }
    };
    const timer = setInterval(tick, 60000); timer.unref(); void tick();
    return () => clearInterval(timer);
}
