import express from 'express';
import { verifyAccessToken } from '../lib/secretToken.js';
import { requireRole } from '../middleware/requireRole.js';
import { updaterRequest } from '../services/softwareUpdateService.js';
import { record, AUDIT_ACTIONS } from '../services/auditService.js';

const router = express.Router();
router.use(verifyAccessToken, requireRole('superadmin'));
router.use((_req,res,next) => { res.set('Cache-Control','no-store'); next(); });
const handle = fn => async (req,res) => {
    try { res.json(await fn(req)); }
    catch (error) {
        const unavailable = ['ENOENT','ECONNREFUSED','EACCES'].includes(error.code);
        res.status(error.status || 503).json({ message: unavailable
            ? 'Web updater is not installed or available. Ask the server operator to run the one-time web updater setup.'
            : error.status ? error.message : 'Updater unavailable. Check the updater service and try again.' });
    }
};
router.get('/releases',handle(() => updaterRequest({action:'releases'})));
router.get('/status',handle(() => updaterRequest({action:'status'})));
router.post('/start',handle(async req => {
    const {tag,commit} = req.body;
    if (typeof tag !== 'string' || tag.length>64 || !/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag) || typeof commit !== 'string' || !/^[a-f0-9]{40}$/.test(commit)) {
        throw Object.assign(new Error('Select an available stable release.'),{status:400});
    }
    const audit = await record(req,{action:AUDIT_ACTIONS.SYSTEM_SETTING_CHANGE,resourceType:'softwareUpdate',resourceId:tag,
        summary:'Requested software update',metadata:{tag,commit}});
    if (!audit) throw new Error('Could not record update request');
    return updaterRequest({action:'start',tag,commit,actor:String(req.user.id || req.user._id)});
}));
router.post('/answer',handle(req => {
    const {promptId,answer} = req.body;
    if (typeof promptId !== 'string' || !/^[a-f0-9]{32}$/.test(promptId) || typeof answer !== 'string' || answer.length>2048 || /[\x00-\x1f]/.test(answer)) {
        throw Object.assign(new Error('Invalid prompt response.'),{status:400});
    }
    // Never record answers: this may be the restic password.
    return updaterRequest({action:'answer',promptId,answer});
}));
router.post('/cancel',handle(() => updaterRequest({action:'cancel'})));
export default router;
