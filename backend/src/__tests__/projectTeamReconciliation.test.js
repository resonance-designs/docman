import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Team from '../models/Team.js';
import Doc from '../models/Doc.js';
import { projectTeamUpdate, reconcileProjectTeams, tryReconcileProjectTeams, reconcilePendingProjectTeams } from '../services/projectTeamReconciliation.js';
jest.mock('../models/Project.js',()=>({__esModule:true,default:{collection:{findOne:jest.fn(),updateOne:jest.fn(),deleteOne:jest.fn(),find:jest.fn()}}}));
jest.mock('../models/Team.js',()=>({__esModule:true,default:{updateOne:jest.fn(),collection:{find:jest.fn()}}}));
jest.mock('../models/Doc.js',()=>({__esModule:true,default:{updateMany:jest.fn()}}));
const oid=n=>new mongoose.Types.ObjectId(n.toString(16).padStart(24,'0'));
const pid=oid(1), a=oid(2), b=oid(3), c=oid(4);
let project, teams;
const snapshot=()=>project && {...project,teams:[...project.teams],teamSyncCandidates:[...project.teamSyncCandidates]};
const linked=id=>teams.get(String(id)).projects.map(String).includes(String(pid));
async function applyTeams(filter, update) {
    const [fence,revision]=Object.entries(update.$set)[0];
    for(const id of [filter._id]){
        const row=teams.get(String(id)); if(!row)continue;
        if(row[fence]!==undefined && row[fence]>revision)continue;
        row[fence]=revision;
        row.projects=row.projects.filter(id=>String(id)!==String(pid));
        if(update.$addToSet)row.projects.push(pid);
    }
    return {acknowledged:true};
}
beforeEach(()=>{
    project={_id:pid,teams:[b],teamSyncCandidates:[a,b],teamSyncPending:true,teamSyncRevision:1};
    teams=new Map([[String(a),{_id:a,projects:[pid]}],[String(b),{_id:b,projects:[]}],[String(c),{_id:c,projects:[]}]]);
    Project.collection.findOne.mockImplementation(async()=>snapshot());
    Project.collection.updateOne.mockImplementation(async filter=>{
        if(project?.teamSyncRevision!==filter.teamSyncRevision)return {matchedCount:0};
        project.teamSyncPending=false;return {matchedCount:1};
    });
    Project.collection.deleteOne.mockImplementation(async filter=>{
        if(!project?.teamSyncDeleting || project.teamSyncRevision!==filter.teamSyncRevision)return {deletedCount:0};
        project=null;return {deletedCount:1};
    });
    Project.collection.find.mockImplementation(()=>({sort(){return this;},limit(){return this;},async *[Symbol.asyncIterator](){if(project?.teamSyncPending)yield {_id:pid};}}));
    Team.collection.find.mockImplementation(()=>({toArray:async()=>[...teams.values()].filter(row=>row.projects.some(id=>String(id)===String(pid)))}));
    Team.updateOne.mockImplementation(applyTeams);
    Doc.updateMany.mockResolvedValue({acknowledged:true});
});
test('canonical mutation carries revision, pending state and historical destinations atomically',()=>{
    const update=projectTeamUpdate([b],[a]);
    expect(update.$set).toEqual({teams:[b],teamSyncPending:true});
    expect(update.$inc.teamSyncRevision).toBe(1);
    expect(update.$addToSet.teamSyncCandidates.$each).toEqual([String(a),String(b)]);
});
test.each([0,1])('failure after %i reciprocal writes retains durable work and a later scan repairs it',async successfulWrites=>{
    if(successfulWrites)Team.updateOne.mockImplementationOnce(applyTeams);
    Team.updateOne.mockRejectedValueOnce(new Error('offline'));
    expect(await tryReconcileProjectTeams(pid)).toBe(false);
    expect(project.teamSyncPending).toBe(true);
    await reconcilePendingProjectTeams();
    expect(linked(a)).toBe(false);expect(linked(b)).toBe(true);
    expect(project.teamSyncPending).toBe(false);
    await reconcileProjectTeams(pid);
    expect(teams.get(String(b)).projects).toHaveLength(1);
});
test('stale worker cannot overwrite a newer revision or clear its pending marker',async()=>{
    let release,entered;
    const paused=new Promise(resolve=>{entered=resolve;});
    Team.updateOne.mockImplementationOnce(async(...args)=>{entered();await new Promise(resolve=>{release=resolve;});return applyTeams(...args);});
    const old=reconcileProjectTeams(pid);await paused;
    project={...project,teams:[c],teamSyncCandidates:[a,b,c],teamSyncRevision:2};
    expect(await reconcileProjectTeams(pid)).toBe(true);
    release();expect(await old).toBe(false);
    expect(linked(a)).toBe(false);expect(linked(b)).toBe(false);expect(linked(c)).toBe(true);
});
test('deletion fences a delayed worker before removing durable project state',async()=>{
    let release,entered;
    const paused=new Promise(resolve=>{entered=resolve;});
    Team.updateOne.mockImplementationOnce(async(...args)=>{entered();await new Promise(resolve=>{release=resolve;});return applyTeams(...args);});
    const old=reconcileProjectTeams(pid);await paused;
    project={...project,teams:[],teamSyncDeleting:true,teamSyncRevision:2};
    await reconcileProjectTeams(pid);
    expect(project).toBeNull();expect(Doc.updateMany).toHaveBeenCalled();
    release();await old;
    expect(linked(a)).toBe(false);expect(linked(b)).toBe(false);
});
test('delete cleanup failure leaves deleting marker available after restart',async()=>{
    project.teamSyncDeleting=true;project.teams=[];
    Doc.updateMany.mockRejectedValueOnce(new Error('offline'));
    await expect(reconcileProjectTeams(pid)).rejects.toThrow('offline');
    expect(project.teamSyncPending).toBe(true);
    await reconcilePendingProjectTeams();expect(project).toBeNull();
});
