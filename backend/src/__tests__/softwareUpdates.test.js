import express from 'express';
import request from 'supertest';
import router from '../routes/softwareUpdateRoutes.js';
import { updaterRequest } from '../services/softwareUpdateService.js';
import { record } from '../services/auditService.js';
jest.mock('../services/softwareUpdateService.js',()=>({updaterRequest:jest.fn()}));
jest.mock('../services/auditService.js',()=>({record:jest.fn(),AUDIT_ACTIONS:{SYSTEM_SETTING_CHANGE:'settings.change'}}));
jest.mock('../lib/secretToken.js',()=>({verifyAccessToken:(req,res,next)=>{
    if(!req.headers['x-test-role'])return res.sendStatus(401);
    req.user={id:'actor',role:req.headers['x-test-role']};next();
}}));
const app=express();app.use(express.json());app.use('/updates',router);
const admin=req=>req.set('x-test-role','superadmin');
beforeEach(()=>{updaterRequest.mockResolvedValue({status:'running'});record.mockResolvedValue({_id:'audit'});});
test.each([undefined,'viewer','editor','admin'])('all updater endpoints reject role %s',async role=>{
    for(const [method,path] of [['get','releases'],['get','status'],['post','start'],['post','answer'],['post','cancel']]){
        const req=request(app)[method]('/updates/'+path);if(role)req.set('x-test-role',role);
        expect((await req).status).toBe(role?403:401);
    }
    expect(updaterRequest).not.toHaveBeenCalled();
});
test.each(['origin/dev','v3.1.0-rc1','v03.1.0','v3.1.0;id'])('rejects nonstable/arbitrary ref %s',async tag=>{
    expect((await admin(request(app).post('/updates/start')).send({tag,commit:'a'.repeat(40)})).status).toBe(400);
    expect(updaterRequest).not.toHaveBeenCalled();
});
test('start forwards only a release pin and authenticated actor after audit',async()=>{
    const response=await admin(request(app).post('/updates/start')).send({tag:'v3.1.0',commit:'a'.repeat(40),command:'ignored',actor:'forged'});
    expect(response.status).toBe(200);
    expect(updaterRequest).toHaveBeenCalledWith({action:'start',tag:'v3.1.0',commit:'a'.repeat(40),actor:'actor'});
    expect(record).toHaveBeenCalled();expect(response.headers['cache-control']).toBe('no-store');
});
test('audit failure prevents privileged update request',async()=>{
    record.mockResolvedValue(null);
    expect((await admin(request(app).post('/updates/start')).send({tag:'v3.1.0',commit:'a'.repeat(40)})).status).toBe(503);
    expect(updaterRequest).not.toHaveBeenCalled();
});
test('password answers are not audited and unexpected fields are dropped',async()=>{
    const response=await admin(request(app).post('/updates/answer')).send({promptId:'b'.repeat(32),answer:'fixture response',command:'ignored'});
    expect(response.status).toBe(200);expect(record).not.toHaveBeenCalled();
    expect(updaterRequest).toHaveBeenCalledWith({action:'answer',promptId:'b'.repeat(32),answer:'fixture response'});
});
test('missing helper returns actionable setup message',async()=>{
    updaterRequest.mockRejectedValue(Object.assign(new Error('missing'),{code:'ENOENT'}));
    const response=await admin(request(app).get('/updates/status'));
    expect(response.status).toBe(503);expect(response.body.message).toContain('one-time');
});
