import Team from '../models/Team.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendTeamInvitationNotification } from '../controllers/notificationsController.js';
import { inviteToTeam, acceptInvitation, addDocumentsToTeam, getTeamBooks, getAllTeams, addProjectsToTeam, removeProjectsFromTeam } from '../controllers/teamsController.js';
import { addDocumentsToProject, updateProject } from '../controllers/projectsController.js';
import { tryReconcileProjectTeams } from '../services/projectTeamReconciliation.js';
jest.mock('../services/projectTeamReconciliation.js',()=>({...jest.requireActual('../services/projectTeamReconciliation.js'),tryReconcileProjectTeams:jest.fn(async()=>true)}));
jest.mock('../models/Team.js',()=>({__esModule:true,default:{findById:jest.fn(),findOne:jest.fn(),findOneAndUpdate:jest.fn(),updateOne:jest.fn(),find:jest.fn()}}));
jest.mock('../models/Project.js',()=>({__esModule:true,default:{findById:jest.fn(),find:jest.fn(),updateOne:jest.fn(),findOneAndUpdate:jest.fn(),findByIdAndUpdate:jest.fn()}}));
jest.mock('../models/User.js',()=>({__esModule:true,default:{findById:jest.fn(),findOne:jest.fn()}}));
jest.mock('../models/Notification.js',()=>({__esModule:true,default:{updateMany:jest.fn()}}));
jest.mock('../controllers/notificationsController.js',()=>({sendTeamInvitationNotification:jest.fn()}));
jest.mock('../lib/notificationHooks.js',()=>({notificationHooks:jest.fn()}));
jest.mock('../services/auditService.js',()=>({record:jest.fn(),AUDIT_ACTIONS:{}}));
const owner='507f1f77bcf86cd799439011', recipient='507f1f77bcf86cd799439012', teamId='507f1f77bcf86cd799439013';
const token='a'.repeat(64), email='invitee@example.test';
const response=()=>{const r={status:jest.fn(),json:jest.fn()};r.status.mockReturnValue(r);return r;};
const req=(body={},role='editor')=>({body,params:{id:teamId,token},user:{_id:owner,role},query:{}});
let team;
beforeEach(()=>{
 team={_id:teamId,owner,isAdmin:()=>false,isMember:()=>false,settings:{allowMemberInvites:false},invitations:[]};
 Team.findById.mockResolvedValue(team);Team.findOne.mockResolvedValue(team);Team.findOneAndUpdate.mockResolvedValue(team);
 User.findOne.mockResolvedValue({_id:recipient,email});User.findById.mockResolvedValue({_id:owner,email});sendTeamInvitationNotification.mockResolvedValue({_id:'notification'});
});
test('invalid invitation email rejected before lookup',async()=>{const r=response();await inviteToTeam(req({email:'bad'}),r);expect(r.status).toHaveBeenCalledWith(400);expect(Team.findById).not.toHaveBeenCalled();});
test('expired pending invitation can be replaced with atomic reservation',async()=>{
 team.invitations=[{email,status:'pending',expiresAt:new Date(0)}];const r=response();await inviteToTeam(req({email}),r);expect(r.status).toHaveBeenCalledWith(200);
 expect(Team.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({invitations:{$not:{$elemMatch:{email,status:'pending',expiresAt:{$gt:expect.any(Date)}}}},'members.user':{$ne:recipient}}),expect.objectContaining({$push:{invitations:expect.objectContaining({email,status:'pending',expiresAt:expect.any(Date)})}}),expect.any(Object));
 expect(r.json.mock.calls[0][0]).not.toHaveProperty('invitationToken');
});
test('concurrent invite loser does not send duplicate notice',async()=>{Team.findOneAndUpdate.mockResolvedValue(null);const r=response();await inviteToTeam(req({email}),r);expect(r.status).toHaveBeenCalledWith(409);expect(sendTeamInvitationNotification).not.toHaveBeenCalled();});
test('failed delivery releases reserved invitation',async()=>{sendTeamInvitationNotification.mockResolvedValue(null);const r=response();await inviteToTeam(req({email}),r);expect(r.status).toHaveBeenCalledWith(503);expect(Team.updateOne).toHaveBeenCalledWith({_id:teamId},{$pull:{invitations:{token:expect.stringMatching(/^[a-f0-9]{64}$/)}}});});
test('malformed token rejected before lookup',async()=>{const r=response();await acceptInvitation({...req(),params:{token:'bad'}},r);expect(r.status).toHaveBeenCalledWith(400);expect(Team.findOne).not.toHaveBeenCalled();});
test('consumption requires matching pending token and recipient atomically',async()=>{
 team.invitations=[{token,email,role:'member',status:'pending',expiresAt:new Date(Date.now()+60000)}];const r=response();await acceptInvitation(req(),r);
 expect(Team.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({invitations:{$elemMatch:{token,email,status:'pending',expiresAt:{$gt:expect.any(Date)}}},'members.user':{$ne:owner}}),expect.objectContaining({$set:expect.objectContaining({'invitations.$.status':'accepted'})}),expect.any(Object));expect(r.status).toHaveBeenCalledWith(200);
});

test('accepted membership remains successful if notification cleanup fails',async()=>{
 jest.spyOn(console,'error').mockImplementation(()=>{});
 team.invitations=[{token,email,role:'member',status:'pending',expiresAt:new Date(Date.now()+60000)}];
 Notification.updateMany.mockRejectedValueOnce(new Error('offline'));
 const r=response();await acceptInvitation(req(),r);expect(r.status).toHaveBeenCalledWith(200);
});

test('uppercase project IDs update both sides of the team relationship',async()=>{
 const projectId='ABCDEF77BCF86CD799439011';
 team.addProject=jest.fn(()=>true);team.save=jest.fn();
 const project={_id:projectId.toLowerCase(),addTeam:jest.fn(),save:jest.fn()};Project.find.mockResolvedValue([project]);
 Project.updateOne.mockResolvedValueOnce({modifiedCount:1});
 const r=response();await addProjectsToTeam(req({projectIds:[projectId]}),r);
 expect(Project.updateOne).toHaveBeenCalledWith(expect.objectContaining({_id:projectId.toLowerCase()}),expect.objectContaining({$addToSet:{teams:teamId,teamSyncCandidates:teamId},$inc:{teamSyncRevision:1}}));
 expect(tryReconcileProjectTeams).toHaveBeenCalledWith(projectId);
 expect(team.save).not.toHaveBeenCalled();
});

function populated(value){const q={select:jest.fn(()=>q),populate:()=>q,then:resolve=>resolve(value)};return q;}
test.each([true,false,undefined])('metadata edit preserves pending status %s without exposing internal field',async pending=>{
 const project={_id:teamId,owner,teams:[],teamSyncPending:pending};
 Project.findById.mockResolvedValueOnce(project);
 const query=populated(project);Project.findByIdAndUpdate.mockReturnValueOnce(query);
 const r=response();await updateProject(req({description:'Changed'}),r);
 expect(r.status).toHaveBeenCalledWith(200);
 expect(query.select).toHaveBeenCalledWith('+teamSyncPending');
 expect(r.json.mock.calls[0][0].relationshipsPending).toBe(Boolean(pending));
 expect(r.json.mock.calls[0][0].project).not.toHaveProperty('teamSyncPending');
 expect(tryReconcileProjectTeams).not.toHaveBeenCalled();
});

test.each([addProjectsToTeam,removeProjectsFromTeam])('no-op canonical membership schedules reciprocal repair for %p',async handler=>{
 Project.find.mockResolvedValue([{_id:recipient}]);
 Project.updateOne.mockResolvedValueOnce({matchedCount:0,modifiedCount:0}).mockResolvedValueOnce({matchedCount:1,modifiedCount:1});
 tryReconcileProjectTeams.mockResolvedValueOnce(false);
 const r=response();await handler(req({projectIds:[recipient]}),r);
 expect(Project.updateOne).toHaveBeenNthCalledWith(2,{_id:recipient,teamSyncDeleting:{$ne:true}}, {
  $set:{teamSyncPending:true,teamSyncActor:owner},$inc:{teamSyncRevision:1},$addToSet:{teamSyncCandidates:teamId}
 });
 expect(r.status).toHaveBeenCalledWith(200);
 expect(r.json.mock.calls[0][0]).toMatchObject({relationshipsPending:true,[handler===addProjectsToTeam?'addedCount':'removedCount']:0});
 expect(tryReconcileProjectTeams).toHaveBeenCalledWith(recipient);
});

test.each([addProjectsToTeam,removeProjectsFromTeam])('matching canonical write does not schedule a second revision for %p',async handler=>{
 Project.find.mockResolvedValue([{_id:recipient}]);
 Project.updateOne.mockResolvedValueOnce({matchedCount:1,modifiedCount:1});
 tryReconcileProjectTeams.mockResolvedValueOnce(true);
 const r=response();await handler(req({projectIds:[recipient]}),r);
 expect(Project.updateOne).toHaveBeenCalledTimes(1);
 expect(r.json.mock.calls[0][0].relationshipsPending).toBe(false);
});
test.each([['2026-11-15',400],['2026-11-25',200]])('date CAS revalidates against concurrently changed end date %s',async(endDate,status)=>{
 Project.findOneAndUpdate.mockReset();Project.findById.mockReset();
 const project={_id:teamId,owner,startDate:new Date('2026-11-10'),endDate:new Date('2026-11-20')};
 Project.findById.mockResolvedValueOnce(project).mockResolvedValueOnce({...project,endDate:new Date(endDate)});
 Project.findOneAndUpdate.mockReturnValueOnce(populated(null)).mockReturnValueOnce(populated(project));
 const r=response();await updateProject(req({startDate:'2026-11-18'}),r);
 expect(Project.findOneAndUpdate.mock.calls[0][0]).toMatchObject({startDate:project.startDate,endDate:project.endDate});
 expect(r.status).toHaveBeenCalledWith(status);
 if(status===200)expect(Project.findOneAndUpdate.mock.calls[1][0].endDate).toEqual(new Date(endDate));
 else expect(Project.findOneAndUpdate).toHaveBeenCalledTimes(1);
});

test('rejected concurrent date update does not mutate reciprocal team links',async()=>{
 Project.findOneAndUpdate.mockReset();Project.findById.mockReset();
 const project={_id:teamId,owner,startDate:new Date('2026-11-10'),endDate:new Date('2026-11-20')};
 Project.findById.mockResolvedValueOnce(project).mockResolvedValueOnce({...project,endDate:new Date('2026-11-15')});
 Project.findOneAndUpdate.mockReturnValueOnce(populated(null));
 const related={_id:teamId,isMember:()=>true,removeProject:jest.fn(),addProject:jest.fn(),save:jest.fn()};
 Team.find.mockResolvedValue([related]);
 const r=response();await updateProject(req({startDate:'2026-11-18',teamIds:[teamId]}),r);
 expect(r.status).toHaveBeenCalledWith(400);expect(related.save).not.toHaveBeenCalled();
 expect(related.removeProject).not.toHaveBeenCalled();expect(related.addProject).not.toHaveBeenCalled();
 expect(tryReconcileProjectTeams).not.toHaveBeenCalled();
});

test('committed project team update reports pending automatic repair instead of false 500',async()=>{
 Project.findById.mockReset();Project.findByIdAndUpdate.mockReset();
 const project={_id:teamId,owner,teams:[recipient]};
 Project.findById.mockResolvedValueOnce(project);
 Project.findByIdAndUpdate.mockReturnValueOnce(populated({...project,teams:[teamId]}));
 Team.find.mockResolvedValue([{_id:teamId,isMember:()=>true}]);
 tryReconcileProjectTeams.mockResolvedValueOnce(false);
 const r=response();await updateProject(req({teamIds:[teamId]}),r);
 expect(r.status).toHaveBeenCalledWith(200);
 expect(r.json).toHaveBeenCalledWith(expect.objectContaining({relationshipsPending:true}));
 expect(Project.findByIdAndUpdate.mock.calls[0][1]).toMatchObject({$set:{teams:[teamId],teamSyncPending:true},$inc:{teamSyncRevision:1}});
});

test('post-commit population failure does not report the project save as failed',async()=>{
 Project.findById.mockReset();Project.findByIdAndUpdate.mockReset();
 const project={_id:teamId,owner,teams:[],populate:jest.fn(async()=>{throw new Error('read unavailable');})};
 Project.findById.mockResolvedValueOnce(project);
 Project.findByIdAndUpdate.mockReturnValueOnce(populated(project));
 const r=response();await updateProject(req({description:'Saved'}),r);
 expect(r.status).toHaveBeenCalledWith(200);
 expect(r.json).toHaveBeenCalledWith(expect.objectContaining({project}));
});
test('concurrent replay cannot grant membership again',async()=>{team.invitations=[{token,email,role:'member',status:'pending',expiresAt:new Date(Date.now()+60000)}];Team.findOneAndUpdate.mockResolvedValue(null);const r=response();await acceptInvitation(req(),r);expect(r.status).toHaveBeenCalledWith(409);expect(Notification.updateMany).not.toHaveBeenCalled();});
test.each([[],['bad'],[{$ne:null}],[teamId,teamId]].map(value=>[value]))('malformed document batch rejected %p',async values=>{for(const fn of [addDocumentsToTeam,addDocumentsToProject]){const r=response();await fn(req({documentIds:values}),r);expect(r.status).toHaveBeenCalledWith(400);}expect(Team.findById).not.toHaveBeenCalled();expect(Project.findById).not.toHaveBeenCalled();});
test('unrelated admin cannot read team resources',async()=>{team.owner=recipient;const chain={populate:jest.fn().mockReturnThis(),then:resolve=>resolve(team)};Team.findById.mockReturnValue(chain);const r=response();await getTeamBooks(req({},'admin'),r);expect(r.status).toHaveBeenCalledWith(403);});
test('team search escapes user regex',async()=>{const chain={populate:jest.fn().mockReturnThis(),sort:jest.fn().mockResolvedValue([])};Team.find.mockReturnValue(chain);const r=response();await getAllTeams({...req({},'superadmin'),query:{search:'(a+)+$'}},r);const filter=Team.find.mock.calls[0][0];expect(filter.$or[0].name.$regex).toBe('\\(a\\+\\)\\+\\$');});
