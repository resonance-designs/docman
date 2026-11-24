import test from 'node:test';
import assert from 'node:assert/strict';
import { projectPermissions, projectPayload } from './projectManagement.js';
const project = { owner: {_id:'owner'}, collaborators:[{user:{_id:'manager'},role:'manager'}] };
test('project management requires both account role and ownership/manager assignment', () => {
 assert.equal(projectPermissions(project,{id:'owner',role:'viewer'}).manage,false);
 assert.equal(projectPermissions(project,{id:'other',role:'admin'}).manage,false);
 assert.equal(projectPermissions(project,{id:'manager',role:'editor'}).manage,true);
 assert.equal(projectPermissions(project,{id:'manager',role:'editor'}).delete,false);
 assert.equal(projectPermissions(project,{id:'other',role:'superadmin'}).delete,true);
});
const valid = {name:' Test ',description:'',teamIds:['one','one'],status:'active',priority:'medium',tagsText:'one, two, one',startDate:'2026-11-20',endDate:''};
test('payload retains deliberate date clearing and deduplicates relationships/tags',()=>{
 assert.deepEqual(projectPayload(valid),{name:'Test',description:'',teamIds:['one'],status:'active',priority:'medium',tags:['one','two'],startDate:'2026-11-20',endDate:null});
});
test('invalid project state is rejected before mutation',()=>{
 for(const patch of [{teamIds:[]},{name:' '},{endDate:'2026-11-19'},{tagsText:'x'.repeat(51)},{priority:'urgent'}]) assert.throws(()=>projectPayload({...valid,...patch}));
});
test('metadata edits omit unchanged team membership but explicit changes retain validation',()=>{
 const form={...valid,teamIds:['two','one','one']};
 assert.equal(Object.hasOwn(projectPayload(form,['one','two']),'teamIds'),false);
 assert.deepEqual(projectPayload(form,['one']).teamIds,['two','one']);
 assert.deepEqual(projectPayload(form).teamIds,['two','one']);
 assert.throws(()=>projectPayload({...form,teamIds:[]},['one','two']));
});
