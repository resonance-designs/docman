import { createHash } from 'node:crypto';
import { updaterHelperStatus } from '../services/updaterHelperStatus.js';
const hash = value => createHash('sha256').update(value).digest('hex');
const good = { protocol: 1, files: { 'runner.py': hash('reviewed'), 'web_service.py': hash('reviewed') } };
test('ready requires both running helper fingerprints to match the deployed files', async () => {
    const request = jest.fn().mockResolvedValue(good), read = jest.fn().mockResolvedValue('reviewed');
    expect((await updaterHelperStatus({ request, read, root: '/app' })).state).toBe('ready');
    expect(request).toHaveBeenCalledWith({ action: 'capabilities' }, 5000);
    request.mockResolvedValue({ ...good, files: { ...good.files, 'runner.py': hash('old') } });
    expect((await updaterHelperStatus({ request, read, root: '/app' })).state).toBe('update-required');
});
test.each([
    [{ status: 409 }, 'update-required'], [{ code: 'ENOENT' }, 'unavailable'],
    [{ code: 'EACCES' }, 'unavailable'], [new Error('private diagnostic'), 'unknown'],
])('legacy/unavailable/unknown failures remain actionable and sanitized', async (error, state) => {
    const result = await updaterHelperStatus({ request: async () => { throw error; } });
    expect(result.state).toBe(state);expect(JSON.stringify(result)).not.toContain('private diagnostic');
});
test('malformed capabilities and unreadable source never report ready', async () => {
    expect((await updaterHelperStatus({ request: async () => ({}) })).state).toBe('unknown');
    expect((await updaterHelperStatus({ request: async () => good, read: async () => { throw new Error('read failed'); } })).state).toBe('unknown');
});
