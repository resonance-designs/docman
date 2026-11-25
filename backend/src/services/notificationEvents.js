// Pure change detection: notify affected users, never reads or no-op saves.
export const idOf = value => value?._id?.toString() || value?.toString() || '';
const ids = values => [...new Set((values || []).map(idOf).filter(Boolean))];
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
export const documentPeople = doc => ids([doc?.author, ...(doc?.owners || []), ...(doc?.approvers || []), ...(doc?.stakeholders || []), ...(doc?.reviewAssignees || [])]);
export const profileFields = { firstname: 'first name', lastname: 'last name', username: 'username', email: 'sign-in email', telephone: 'phone', title: 'position', department: 'department', bio: 'bio', contactEmail: 'contact email', location: 'location', website: 'website', avatarDataUrl: 'profile photo', profilePicture: 'profile photo', backgroundImage: 'background image', theme: 'theme' };
export function changeEvents(kind, before, after, context = {}) {
    const events = [], row = after || before;
    if (!row) return events;
    const push = (recipients, title, message, extra = {}) => {
        for (const recipient of ids(recipients)) events.push({ recipient, type: 'message', title, message, ...extra });
    };
    if (kind === 'Document') {
        const extra = { relatedDoc: row._id };
        const roles = ['author', 'owners', 'approvers', 'stakeholders', 'reviewAssignees'];
        const memberships = doc => Object.fromEntries(roles.map(role => [role, ids(role === 'author' ? [doc?.author] : doc?.[role]).sort()]));
        const old = memberships(before), next = memberships(after);
        for (const person of ids([...documentPeople(before), ...documentPeople(after)])) {
            const previous = roles.filter(role => old[role].includes(person));
            const current = roles.filter(role => next[role].includes(person));
            const labels = { author: 'Author', owners: 'Owner', approvers: 'Approver', stakeholders: 'Stakeholder', reviewAssignees: 'Review assignee' };
            if (!same(previous, current)) push([person], 'Document assignments changed', `Your document assignments changed. Current assignments: ${current.map(role => labels[role]).join(', ') || 'none'}.`, extra);
        }
        if (before && after && !same(before.deletedAt, after.deletedAt)) push(documentPeople(row), after.deletedAt ? 'Document deleted' : 'Document restored', 'A document associated with you was deleted or restored. Open DocMan for its current status.', extra);
        else if (before && after && ['title', 'description', 'category', 'opensForReview', 'reviewInterval', 'reviewPeriod', 'reviewCompleted'].some(k => !same(before[k], after[k]))) push(documentPeople(after), 'Document updated', 'Document details or review status changed. Open DocMan to review the changes.', extra);
    }
    if (kind === 'User' && before && after) {
        const changed = [...new Set(Object.entries(profileFields).filter(([key]) => !same(before[key] || '', after[key] || '')).map(([, label]) => label))];
        if (context.passwordChanged) changed.push('password');
        if (changed.length && !before.invitationPending) push([row._id], 'Account/profile updated',
            `Your DocMan account/profile was updated. Changed: ${changed.join(', ')}.\n\nIf you did not authorize this change, reset your credentials immediately using the password reset option on the sign-in page and contact your administrator. If your account is managed by an identity provider, reset your credentials there.`, { type: 'profile_updated' });
        if (before.role !== after.role) push([row._id], 'Account role changed', `Your DocMan role is now ${after.role}.`);
        if (before.isActive !== after.isActive && !before.invitationPending) push([row._id], after.isActive ? 'Account enabled' : 'Account disabled', `Your DocMan account has been ${after.isActive ? 'enabled' : 'disabled'}.`, { allowInactiveEmail: true });
    }
    if (kind === 'Team' || kind === 'Project') {
        const field = kind === 'Team' ? 'members' : 'collaborators';
        const members = doc => new Map([...(doc?.[field] || []).map(m => [idOf(m.user), m.role]), ...(doc?.owner ? [[idOf(doc.owner), 'owner']] : [])]);
        const old = members(before), next = members(after);
        const extra = kind === 'Team' ? { relatedTeam: row._id } : { relatedProject: row._id };
        for (const person of new Set([...old.keys(), ...next.keys()])) {
            if (old.get(person) !== next.get(person)) push([person], `${kind} membership changed`, `Your ${kind.toLowerCase()} membership is now ${next.get(person) || 'removed'}. Open DocMan for details.`, extra);
        }
        if (before && after && ['name', 'description', 'status', 'documents', 'books', 'teams', 'projects'].some(k => !same(before[k], after[k]))) push([...next.keys()], `${kind} updated`, `A ${kind.toLowerCase()} you belong to was updated. Open DocMan for details.`, extra);
    }
    if (kind === 'ReviewAssignment' && after && (!before || ['assignee', 'dueDate', 'status', 'requiresUpdates', 'updateNotes'].some(k => !same(before[k], after[k])))) {
        // Assignment alerts are account activity, not document disclosures. Saving a
        // task does not grant document access; omit the resource reference so a new
        // reviewer (or a removed reviewer) can still receive this generic notice.
        push([row.assignee, row.assignedBy, before?.assignee], 'Review assignment updated', `A review assignment was created or changed. Current status: ${row.status}. Open DocMan for details.`);
    }
    if (kind === 'File' && after && before?.status !== after.status) {
        const doc = context.document;
        if (!doc) return events;
        const reviewers = ids(doc.approvers?.length ? doc.approvers : doc.owners).filter(id => id !== idOf(row.uploadedBy));
        if (after.status === 'pending_approval') push(reviewers, 'Document approval requested', `Version ${row.version} is awaiting approval.`, { relatedDoc: doc._id });
        if (after.status === 'approved') push(documentPeople(doc), 'Document version published', `Version ${row.version} was published.`, { relatedDoc: doc._id });
        if (['rejected', 'withdrawn'].includes(after.status)) push([row.uploadedBy, ...reviewers, ...(doc.owners || [])], `Document version ${after.status}`, `Version ${row.version} was ${after.status}.`, { relatedDoc: doc._id });
    }
    return events;
}
