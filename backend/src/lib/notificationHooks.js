import crypto from 'node:crypto';
import Notification from '../models/Notification.js';
import { changeEvents } from '../services/notificationEvents.js';
// Capture only fields used to select recipients/events; never read passwords or keys.
const fields = {
    Document: 'author owners approvers stakeholders reviewAssignees title description category opensForReview reviewInterval reviewPeriod reviewCompleted deletedAt updatedAt',
    User: 'role isActive invitationPending updatedAt',
    Team: 'owner members name description documents books projects updatedAt',
    Project: 'owner collaborators name description status documents books teams updatedAt',
    ReviewAssignment: 'document assignee assignedBy dueDate status requiresUpdates updateNotes updatedAt',
    File: 'documentId uploadedBy status version updatedAt',
};
export function notificationHooks(schema, { kind }) {
    const selection = fields[kind];
    const read = (model, filter) => model.findOne(filter).setOptions({ includeDeleted: true }).select(selection).lean();
    async function emit(model, before, after) {
        try {
            let document;
            if (kind === 'File' && before?.status === after?.status) return;
            if (kind === 'File') document = await model.db.model('Document').findById((after || before).documentId).lean();
            const events = changeEvents(kind, before, after, { document });
            const row = after || before;
            for (const event of events) {
                const eventKey = crypto.createHash('sha256').update(JSON.stringify([kind, String(row._id), row.updatedAt, event])).digest('hex');
                await Notification.updateOne({ eventKey }, { $setOnInsert: { ...event, eventKey, emailStatus: 'pending', emailNextAttempt: new Date() } }, { upsert: true, setDefaultsOnInsert: true });
            }
        } catch (error) {
            // Never claim a successful state change failed merely because queue storage failed.
            console.error('Notification enqueue failed:', kind, error?.name || 'Error');
        }
    }
    schema.pre('save', async function() {
        this.$locals.notificationBefore = this.isNew ? null : await read(this.constructor, { _id: this._id });
        // A stale Mongoose instance saves modified paths only. Do not compare its
        // unchanged in-memory role/membership against freshly persisted values.
        const before = this.$locals.notificationBefore;
        const submitted = this.toObject();
        this.$locals.notificationAfter = before ? { ...before } : submitted;
        if (before) {
            for (const field of selection.split(' ')) {
                if (this.isModified(field)) this.$locals.notificationAfter[field] = submitted[field];
            }
        }
    });
    schema.post('save', async function(doc) { await emit(doc.constructor, doc.$locals.notificationBefore, doc.$locals.notificationAfter || doc.toObject()); });
    for (const operation of ['findOneAndUpdate', 'updateOne', 'findOneAndDelete', 'deleteOne']) {
        schema.pre(operation, { query: true, document: false }, async function() { this.notificationBefore = await read(this.model, this.getFilter()); });
        schema.post(operation, { query: true, document: false }, async function(result) {
            try {
            if (!this.notificationBefore) return;
            if (result?.matchedCount === 0 || result?.deletedCount === 0 || result === null) return;
            const after = operation.includes('Delete') || operation === 'deleteOne' ? null : await read(this.model, { _id: this.notificationBefore._id });
            await emit(this.model, this.notificationBefore, after);
            } catch (error) { console.error('Notification observation failed:', kind, error?.name || 'Error'); }
        });
    }
}
