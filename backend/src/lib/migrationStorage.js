import fs from 'node:fs';
import { resolveStoredFile, sha256File } from './fileIntegrity.js';

// Every retained File record requires its stored bytes, even with a known checksum.
export async function inspectMigrationStorage(File, { dryRun = true } = {}) {
    const result = { checksumsRecorded: 0, missingFiles: [] };
    for (const file of await File.find({})) {
        const absolutePath = resolveStoredFile(file.filename);
        if (!absolutePath || !fs.existsSync(absolutePath)) {
            result.missingFiles.push({ fileId: String(file._id), documentId: String(file.documentId), filename: file.filename });
            continue;
        }
        if (file.sha256) continue;
        const sha256 = await sha256File(absolutePath);
        if (!dryRun) await File.updateOne({ _id: file._id }, { $set: { sha256 } });
        result.checksumsRecorded++;
    }
    return result;
}
