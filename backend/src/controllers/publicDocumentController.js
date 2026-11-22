import { getPublicSharingPolicy, publicLinksBlocked } from '../services/publicSharingPolicy.js';
import crypto from 'node:crypto';
import Doc from '../models/Doc.js';
import File from '../models/File.js';
import { downloadFile } from './versionController.js';
import { record, AUDIT_ACTIONS } from '../services/auditService.js';

export async function sharingSettings(req, res) {
    try {
        const doc = await Doc.findById(req.document._id).select('+publicShareToken').lean();
        return res.json({ enabled: Boolean(doc.publicShareToken), token: doc.publicShareToken || null, policy: await getPublicSharingPolicy() });
    } catch { return res.status(500).json({ message: 'Unable to load sharing settings.' }); }
}
export async function setSharing(req, res) {
    if (typeof req.body?.enabled !== 'boolean') return res.status(400).json({ message: 'Choose whether public sharing is enabled.' });
    try {
        const policy = await getPublicSharingPolicy();
        if (req.body.enabled && !policy.enabled) return res.status(403).json({ message: 'Public sharing has been disabled by a superadmin.' });
        // A new random link is issued on every enable. Disabling removes the previous link permanently.
        const token = req.body.enabled ? crypto.randomBytes(32).toString('hex') : null;
        const doc = await Doc.findOneAndUpdate({ _id: req.document._id, deletedAt: null },
            token ? { $set: { publicShareToken: token } } : { $unset: { publicShareToken: 1 } }, { new: true });
        if (!doc) return res.status(404).json({ message: 'Document not found.' });
        await record(req, { action: AUDIT_ACTIONS.DOCUMENT_UPDATE, resourceType: 'document', resourceId: doc._id, documentId: doc._id, summary: token ? 'Enabled public link sharing' : 'Disabled public link sharing' });
        return res.json({ enabled: Boolean(token), token, policy });
    } catch { return res.status(500).json({ message: 'Unable to update sharing settings.' }); }
}
export async function resolvePublicDocument(req, res, next) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (!/^[a-f0-9]{64}$/.test(req.params.token || '')) return res.status(404).json({ message: 'Public document unavailable.' });
    try {
        if (publicLinksBlocked(await getPublicSharingPolicy())) return res.status(404).json({ message: 'Public document unavailable.' });
        const doc = await Doc.findOne({ publicShareToken: req.params.token, deletedAt: null, currentVersion: { $gt: 0 } }).lean();
        if (!doc) return res.status(404).json({ message: 'Public document unavailable.' });
        const file = await File.findOne({ documentId: doc._id, version: doc.currentVersion, status: 'approved' }).lean();
        if (!file) return res.status(404).json({ message: 'Public document unavailable.' });
        req.document = doc; req.publicFile = file; return next();
    } catch { return res.status(500).json({ message: 'Unable to load public document.' }); }
}
export function publicDetails(req, res) {
    const file = req.publicFile;
    return res.json({ title: req.document.title, filename: file.originalname, size: file.size, version: file.version });
}
export async function publicDownload(req, res) {
    req.params.fileId = String(req.publicFile._id);
    return downloadFile(req, res);
}
