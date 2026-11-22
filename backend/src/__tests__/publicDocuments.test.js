import { getPublicSharingPolicy } from '../services/publicSharingPolicy.js';
import Doc from '../models/Doc.js';
import File from '../models/File.js';
import { resolvePublicDocument, publicDetails, setSharing } from '../controllers/publicDocumentController.js';
import { record } from '../services/auditService.js';
jest.mock('../models/Doc.js', () => ({ __esModule: true, default: { findOne: jest.fn(), findOneAndUpdate: jest.fn() } }));
jest.mock('../models/File.js', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('../controllers/versionController.js', () => ({ downloadFile: jest.fn() }));
jest.mock('../services/auditService.js', () => ({ record: jest.fn(), AUDIT_ACTIONS: { DOCUMENT_UPDATE: 'document.update' } }));
jest.mock('../services/publicSharingPolicy.js', () => ({ ...jest.requireActual('../services/publicSharingPolicy.js'), getPublicSharingPolicy: jest.fn() }));
const token = 'a'.repeat(64);
const doc = { _id: 'doc', title: 'Public title', currentVersion: 2, owners: ['private'], description: 'private metadata' };
const file = { _id: 'file', originalname: 'test.txt', size: 12, version: 2, path: '/secret', approvals: ['private'] };
const response = () => { const res = { status: jest.fn(), json: jest.fn(), setHeader: jest.fn() }; res.status.mockReturnValue(res); return res; };
beforeEach(() => {
    getPublicSharingPolicy.mockResolvedValue({ enabled: true, disableExistingLinks: true });
    Doc.findOne.mockReturnValue({ lean: async () => doc }); File.findOne.mockReturnValue({ lean: async () => file });
    Doc.findOneAndUpdate.mockResolvedValue(doc); record.mockResolvedValue({});
});
test('anonymous resolution requires live token, nondeleted document and current approved version', async () => {
    const req = { params: { token } }, res = response(), next = jest.fn();
    await resolvePublicDocument(req, res, next);
    expect(Doc.findOne).toHaveBeenCalledWith({ publicShareToken: token, deletedAt: null, currentVersion: { $gt: 0 } });
    expect(File.findOne).toHaveBeenCalledWith({ documentId: 'doc', version: 2, status: 'approved' });
    expect(next).toHaveBeenCalled(); expect(req.publicFile).toEqual(file);
});
test.each(['', 'short', '../secret'])('malformed token %s is unavailable', async value => {
    const res = response(); await resolvePublicDocument({ params: { token: value } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404); expect(Doc.findOne).not.toHaveBeenCalled();
});
test('revoked or deleted document link returns 404', async () => {
    Doc.findOne.mockReturnValue({ lean: async () => null }); const res = response(); const next = jest.fn();
    await resolvePublicDocument({ params: { token } }, res, next); expect(res.status).toHaveBeenCalledWith(404); expect(next).not.toHaveBeenCalled();
});
test('no approved current file returns 404', async () => {
    File.findOne.mockReturnValue({ lean: async () => null }); const res = response();
    await resolvePublicDocument({ params: { token } }, res, jest.fn()); expect(res.status).toHaveBeenCalledWith(404);
});
test('public response uses explicit minimal allowlist', () => {
    const res = response(); publicDetails({ document: doc, publicFile: file }, res);
    expect(res.json).toHaveBeenCalledWith({ title: 'Public title', filename: 'test.txt', size: 12, version: 2 });
});
test('enable generates random link; disable removes it and audit never stores token', async () => {
    const res = response(); await setSharing({ document: doc, body: { enabled: true } }, res);
    const data = res.json.mock.calls[0][0]; expect(data.token).toMatch(/^[a-f0-9]{64}$/); expect(JSON.stringify(record.mock.calls)).not.toContain(data.token);
    await setSharing({ document: doc, body: { enabled: false } }, response());
    expect(Doc.findOneAndUpdate.mock.calls[1][1]).toEqual({ $unset: { publicShareToken: 1 } });
});

test('global disable blocks anonymous pages and downloads before document lookup', async () => {
    getPublicSharingPolicy.mockResolvedValue({ enabled: false, disableExistingLinks: true });
    const res = response(), next = jest.fn(); await resolvePublicDocument({ params: { token } }, res, next);
    expect(res.status).toHaveBeenCalledWith(404); expect(Doc.findOne).not.toHaveBeenCalled(); expect(next).not.toHaveBeenCalled();
});
test('global disable can preserve existing links', async () => {
    getPublicSharingPolicy.mockResolvedValue({ enabled: false, disableExistingLinks: false });
    const next = jest.fn(); await resolvePublicDocument({ params: { token } }, response(), next); expect(next).toHaveBeenCalled();
});
test('global disable forbids link creation but permits individual revocation', async () => {
    getPublicSharingPolicy.mockResolvedValue({ enabled: false, disableExistingLinks: false });
    const res = response(); await setSharing({ document: doc, body: { enabled: true } }, res);
    expect(res.status).toHaveBeenCalledWith(403); expect(Doc.findOneAndUpdate).not.toHaveBeenCalled();
    await setSharing({ document: doc, body: { enabled: false } }, response()); expect(Doc.findOneAndUpdate).toHaveBeenCalled();
});
test('policy lookup failure fails closed', async () => {
    getPublicSharingPolicy.mockRejectedValue(new Error('database unavailable'));
    const next = jest.fn(); await resolvePublicDocument({ params: { token } }, response(), next); expect(next).not.toHaveBeenCalled(); expect(Doc.findOne).not.toHaveBeenCalled();
});
