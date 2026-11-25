import express from 'express';
import request from 'supertest';
import SystemSetting from '../models/SystemSetting.js';
import { record } from '../services/auditService.js';
import router from '../routes/appearanceRoutes.js';
import { appearanceDefaults, validateAppearance, getAppearance, MAX_LOGO_BYTES } from '../services/appearanceSettingsService.js';

let mockRow = null;
jest.mock('../models/SystemSetting.js', () => ({ __esModule: true, default: {
    findOne: jest.fn(() => ({ lean: async () => mockRow })),
    findOneAndUpdate: jest.fn(async (filter, update) => { mockRow = { value: update.$set.value }; }),
} }));
jest.mock('../lib/secretToken.js', () => ({ verifyAccessToken: (req, res, next) => {
    const role = req.get('X-Test-Role');
    if (!role) return res.status(401).json({ message: 'Not authenticated' });
    req.user = { id: '507f1f77bcf86cd799439011', role }; next();
} }));
jest.mock('../services/auditService.js', () => ({ record: jest.fn(), AUDIT_ACTIONS: { SYSTEM_SETTING_CHANGE: 'system.setting.change' } }));
const app = express(); app.use(express.json({ limit: '1mb' })); app.use('/appearance', router);
beforeEach(() => { mockRow = null; jest.clearAllMocks(); record.mockResolvedValue({ _id: 'audit' }); });

test('public response contains branding only, with default settings before first save', async () => {
    mockRow = { value: appearanceDefaults(), updatedBy: 'private-actor', private: 'secret' };
    const response = await request(app).get('/appearance').expect(200);
    expect(Object.keys(response.body).sort()).toEqual(['defaults', 'settings']);
    expect(response.body.settings).toEqual(appearanceDefaults());
    expect(response.headers['cache-control']).toBe('no-store');
});
test.each(['admin', 'superadmin'])('%s can persist application-wide appearance', async role => {
    const settings = appearanceDefaults(); settings.menuPosition = 'right'; settings.typography.h1.fontSize = 42;
    const response = await request(app).put('/appearance').set('X-Test-Role', role).send(settings).expect(200);
    expect(response.body).toMatchObject({ committed: true, auditRecorded: true, settings });
    const read = await request(app).get('/appearance').expect(200);
    expect(read.body.settings).toEqual(settings);
    expect(SystemSetting.findOneAndUpdate).toHaveBeenCalledWith({ key: 'ui.appearance' }, expect.objectContaining({ $set: expect.objectContaining({ updatedBy: '507f1f77bcf86cd799439011' }) }), expect.any(Object));
    expect(record).toHaveBeenCalledTimes(1);
});
test.each(['viewer', 'editor', 'unknown'])('%s cannot alter appearance', async role => {
    await request(app).put('/appearance').set('X-Test-Role', role).send(appearanceDefaults()).expect(403);
    expect(SystemSetting.findOneAndUpdate).not.toHaveBeenCalled();
});
test('anonymous callers cannot alter appearance', async () => {
    await request(app).put('/appearance').send(appearanceDefaults()).expect(401);
    expect(SystemSetting.findOneAndUpdate).not.toHaveBeenCalled();
});
test.each([
    s => { s.typography.h1.color = 'red; background:url(https://evil.test)'; },
    s => { s.typography.paragraph.fontSize = 9; },
    s => { s.typography.link.fontSize = 73; },
    s => { s.typography.h2.fontSize = '20'; },
    s => { s.typography.h3.fontSize = 18.5; },
    s => { s.menuPosition = 'floating'; },
    s => { s.footer.linkUrl = 'javascript:alert(1)'; s.footer.linkLabel = 'Link'; },
    s => { s.footer.linkUrl = 'https://user:password@example.org'; s.footer.linkLabel = 'Link'; },
    s => { s.footer.linkUrl = '//example.org'; s.footer.linkLabel = 'Link'; },
    s => { s.footer.linkUrl = 'https:example.org'; s.footer.linkLabel = 'Link'; },
    s => { s.footer.linkLabel = 'Missing URL'; },
    s => { s.footer.text = 'x'.repeat(501); },
    s => { s.footer.html = '<script>alert(1)</script>'; },
    s => { s.logo.dataUrl = 'https://example.org/logo.png'; },
    s => { s.logo.dataUrl = 'data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64'); },
    s => { s.logo.dataUrl = 'data:image/png;base64,' + Buffer.from('<script/>').toString('base64'); },
    s => { s.logo.dataUrl = 'data:image/png;base64,' + Buffer.alloc(MAX_LOGO_BYTES + 1).toString('base64'); },
    s => { delete s.typography.h6; },
])('invalid customization is rejected before mutation %#', async mutate => {
    const settings = appearanceDefaults(); mutate(settings);
    await request(app).put('/appearance').set('X-Test-Role', 'admin').send(settings).expect(400);
    expect(SystemSetting.findOneAndUpdate).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
});
test('raster logo persists, can be removed, and its contents are omitted from audit', async () => {
    const settings = appearanceDefaults();
    settings.logo.dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
    await request(app).put('/appearance').set('X-Test-Role', 'admin').send(settings).expect(200);
    expect(JSON.stringify(record.mock.calls.map(call => call[1]))).not.toContain('iVBOR');
    expect((await getAppearance()).logo).toEqual(settings.logo);
    await request(app).put('/appearance').set('X-Test-Role', 'admin').send(appearanceDefaults()).expect(200);
    expect((await getAppearance()).logo.dataUrl).toBe('');
});
test('stored malicious values fall back safely without leaking other settings', async () => {
    mockRow = { value: { ...appearanceDefaults(), logo: { dataUrl: 'javascript:alert(1)', alt: '' } } };
    expect(await getAppearance()).toEqual(appearanceDefaults());
});
test('text is retained as text; valid footer URL and boundary sizes accepted', () => {
    const settings = appearanceDefaults();
    settings.footer = { ...settings.footer, enabled: true, text: '<b>Plain text</b>', linkLabel: 'Help', linkUrl: 'https://example.org/help' };
    settings.typography.h1.fontSize = 72; settings.typography.h6.fontSize = 10;
    expect(validateAppearance(settings)).toEqual(settings);
});
test.each(['null', 'throw'])('committed write reports audit failure (%s) without a false save failure', async mode => {
    if (mode === 'null') record.mockResolvedValueOnce(null); else record.mockRejectedValueOnce(new Error('offline'));
    const result = await request(app).put('/appearance').set('X-Test-Role', 'admin').send(appearanceDefaults()).expect(200);
    expect(result.body).toMatchObject({ committed: true, auditRecorded: false, warning: expect.any(String) });
});
test('storage failure returns service error and does not record success', async () => {
    SystemSetting.findOneAndUpdate.mockRejectedValueOnce(new Error('database unavailable'));
    await request(app).put('/appearance').set('X-Test-Role', 'admin').send(appearanceDefaults()).expect(503);
    expect(record).not.toHaveBeenCalled();
});
