// Invoked only after the updater's service checks succeed; never sends SMTP inline.
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Notification from '../models/Notification.js';
import { installedRelease, queueCompletedUpdate } from '../services/systemUpdateNotifications.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: path.join(root, 'backend', '.env.prod') });
try {
    const [runId, commit] = process.argv.slice(2);
    const installed = await installedRelease(root);
    if (commit !== installed.commit || !/^[a-zA-Z0-9-]{1,100}$/.test(runId || '')) throw new Error('Invalid completed update');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    await Notification.init();
    const queued = await queueCompletedUpdate({ status: 'complete', tag: `v${installed.version}`, commit, report: { run_id: runId, target_commit: commit } }, installed);
    if (!queued) throw new Error('Update notification not queued');
    console.log('System update notifications queued.');
} catch (error) {
    console.error('System update notification enqueue failed:', error?.name || 'Error');
    process.exitCode = 1;
} finally { await mongoose.disconnect(); }
