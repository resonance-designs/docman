import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { updaterRequest } from './softwareUpdateService.js';

const files = ['runner.py', 'web_service.py'];
export async function updaterHelperStatus({ request = updaterRequest, read = readFile,
    root = path.resolve(path.dirname(process.argv[1]), '../..') } = {}) {
    try {
        const info = await request({ action: 'capabilities' }, 5000);
        if (info?.protocol !== 1 || !files.every(name => /^[a-f0-9]{64}$/.test(info.files?.[name] || ''))) {
            return { state: 'unknown', message: 'The helper returned an unrecognized readiness response. Ask the server operator to verify its installation.' };
        }
        const expected = await Promise.all(files.map(async name => createHash('sha256').update(await read(path.join(root, 'scripts/update', name))).digest('hex')));
        const matches = files.every((name, index) => expected[index] === info.files[name]);
        return matches
            ? { state: 'ready', message: 'The running helper matches this application release.' }
            : { state: 'update-required', message: 'The running helper differs from this application release. The server operator must refresh it.' };
    } catch (error) {
        if (error?.status === 409) return { state: 'update-required', message: 'This helper predates readiness checks. The server operator must refresh it.' };
        if (['ENOENT', 'ECONNREFUSED', 'EACCES'].includes(error?.code)) return { state: 'unavailable', message: 'The helper or its installation files are unavailable. Ask the server operator to verify setup and service permissions.' };
        return { state: 'unknown', message: 'Helper readiness could not be verified. Retry when the backend is available or contact the server operator.' };
    }
}
