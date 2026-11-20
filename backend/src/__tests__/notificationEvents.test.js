import { changeEvents } from '../services/notificationEvents.js';
const doc = { _id: 'doc', author: 'author', owners: ['owner'], approvers: ['approver'], stakeholders: ['reader'], reviewAssignees: ['reviewer'], title: 'Private title' };
test('document creation includes every assignment role and deduplicates people', () => {
    const events = changeEvents('Document', null, { ...doc, owners: ['owner', 'author'] });
    expect(events.map(e => e.recipient).sort()).toEqual(['approver', 'author', 'owner', 'reader', 'reviewer']);
    expect(JSON.stringify(events)).not.toContain('Private title');
});
test('ordinary saves do not resend assignment notices', () => {
    expect(changeEvents('Document', doc, { ...doc, updatedAt: new Date() })).toEqual([]);
});
test('role moves and removal notify affected users, not unchanged assignees', () => {
    const events = changeEvents('Document', doc, { ...doc, stakeholders: [], reviewAssignees: ['reviewer', 'reader'] });
    expect(events).toHaveLength(1); expect(events[0].recipient).toBe('reader');
    expect(events[0].message).toContain('Review assignee');
});
test('no notices for logins and session/token/password writes', () => {
    expect(changeEvents('User', { _id: 'u', role: 'viewer', isActive: true }, { _id: 'u', role: 'viewer', isActive: true, password: 'secret', refreshTokenHash: 'secret' })).toEqual([]);
});
test('account role and disabled-state changes notify target, including disabled email', () => {
    const events = changeEvents('User', { _id: 'u', role: 'viewer', isActive: true }, { _id: 'u', role: 'editor', isActive: false });
    expect(events).toHaveLength(2); expect(events[1].allowInactiveEmail).toBe(true);
});
test.each(['Team', 'Project'])('%s detects adds, removals and role changes', kind => {
    const field = kind === 'Team' ? 'members' : 'collaborators';
    const old = { _id: 't', owner: 'owner', [field]: [{ user: 'old', role: 'member' }, { user: 'changed', role: 'member' }] };
    const next = { ...old, [field]: [{ user: 'new', role: 'member' }, { user: 'changed', role: 'admin' }] };
    expect(changeEvents(kind, old, next).map(e => e.recipient).sort()).toEqual(['changed', 'new', 'old']);
});
test('pending versions notify designated approvers except uploader; publication reaches readers', () => {
    const file = { _id: 'f', uploadedBy: 'approver', version: 2, status: 'pending_approval' };
    expect(changeEvents('File', null, file, { document: doc })).toEqual([]);
    const published = changeEvents('File', file, { ...file, status: 'approved' }, { document: doc });
    expect(published.map(e => e.recipient)).toContain('reader');
});
test('rejected versions do not notify stakeholders', () => {
    const events = changeEvents('File', { status: 'pending_approval' }, { uploadedBy: 'uploader', version: 3, status: 'rejected' }, { document: doc });
    expect(events.map(e => e.recipient)).not.toContain('reader');
    expect(events.map(e => e.recipient)).toContain('uploader');
});
test('review tasks notify assignee and assigner without disclosing notes', () => {
    const events = changeEvents('ReviewAssignment', null, { document: 'doc', assignee: 'a', assignedBy: 'b', status: 'pending', notes: 'private' });
    expect(events).toHaveLength(2); expect(JSON.stringify(events)).not.toContain('private');
});
