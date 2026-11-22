import mongoose from '../../backend/node_modules/mongoose/index.js';
import User from '../../backend/src/models/User.js';
import Category from '../../backend/src/models/Category.js';
import SystemSetting from '../../backend/src/models/SystemSetting.js';
import EmailSetting from '../../backend/src/models/EmailSetting.js';
import AuditLog from '../../backend/src/models/AuditLog.js';
import { record, AUDIT_ACTIONS } from '../../backend/src/services/auditService.js';
import { defaults } from '../../backend/src/services/emailSettingsService.js';

// Called as the unprivileged service account. Credentials arrive only over stdin.
let input = '';
for await (const chunk of process.stdin) input += chunk;
try {
    const { person, uploadMB } = JSON.parse(input);
    if (!person || typeof person.password !== 'string' || [...person.password].length < 18 ||
        Buffer.byteLength(person.password) > 72 || !Number.isInteger(uploadMB) || uploadMB < 1 || uploadMB > 250) {
        throw new Error('Invalid bootstrap input');
    }
    await mongoose.connect(process.env.MONGO_URI);
    await Promise.all([User.init(), Category.init(), SystemSetting.init(), EmailSetting.init(), AuditLog.init()]);
    const matches = await User.find({ $or: [{ email: person.email }, { username: person.username }] });
    if (matches.length) {
        if (matches.length !== 1 || matches[0].email !== person.email || matches[0].username !== person.username ||
            matches[0].role !== 'superadmin' || !matches[0].isActive || matches[0].identityProvider !== 'local') {
            throw new Error('Conflicting existing administrator');
        }
        console.log('PASS: initial superadmin already exists; password and permissions were not changed.');
    } else {
        await User.create({ firstname: person.firstname, lastname: person.lastname, email: person.email,
            username: person.username, password: person.password, role: 'superadmin', identityProvider: 'local' });
        console.log('PASS: initial superadmin created.');
    }
    const administrator = await User.findOne({ username: person.username });
    // install.sh holds the single-installer lock. Recover a missing creation audit on a retry.
    if (!await AuditLog.exists({ action: AUDIT_ACTIONS.USER_CREATE, resourceType: 'user', resourceId: String(administrator._id) })) {
        await record(null, { action: AUDIT_ACTIONS.USER_CREATE, resourceType: 'user', resourceId: administrator._id,
            summary: 'Created initial administrator through the server installer', metadata: { role: 'superadmin', source: 'installer' } });
    }
    await Category.findOneAndUpdate({ name: 'General' }, { $setOnInsert: {
        description: 'General shared documents', type: 'Document'
    } }, { upsert: true, runValidators: true });
    await SystemSetting.findOneAndUpdate({ key: 'documents.storage' }, { $setOnInsert: {
        value: { encryptAtRest: true, maxUploadMB: uploadMB }
    } }, { upsert: true, runValidators: true });
    await EmailSetting.findOneAndUpdate({ _id: 'outbound' }, { $setOnInsert: {
        config: { ...defaults(), provider: 'disabled' }, encryptedSecrets: '', revision: 1
    } }, { upsert: true, runValidators: true });
    console.log('PASS: General category, encrypted storage and initial disabled email settings are ready.');
} catch {
    // Do not print exception objects: database errors can contain credentials or user input.
    console.error('STOP: initial account/settings setup failed. Check database access and account conflicts; existing accounts were not reset.');
    process.exitCode = 1;
} finally {
    input = '';
    await mongoose.disconnect();
}
