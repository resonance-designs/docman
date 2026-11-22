import mongoose from 'mongoose';
jest.mock('../lib/categoryWriteLock.js', () => ({ withCategoryWriteLock: work => work() }));
import Category from '../models/Category.js';
import Doc from '../models/Doc.js';
import Book from '../models/Book.js';
import Team from '../models/Team.js';
import Project from '../models/Project.js';
import { getAllProjects, getProjectById } from '../controllers/projectsController.js';
import { deleteBook } from '../controllers/booksController.js';
import { categoryInput, createCategory, updateCategory, deleteCategory, getAllCategories } from '../controllers/categoriesController.js';

jest.mock('../models/Category.js', () => ({ __esModule: true, default: { create: jest.fn(), findById: jest.fn(), findByIdAndUpdate: jest.fn(), findByIdAndDelete: jest.fn(), find: jest.fn(), countDocuments: jest.fn() } }));
jest.mock('../models/Doc.js', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('../models/Book.js', () => ({ __esModule: true, default: { exists: jest.fn(), findById: jest.fn(), findByIdAndDelete: jest.fn() } }));
jest.mock('../services/auditService.js', () => ({ record: jest.fn(), AUDIT_ACTIONS: {} }));
jest.mock('../lib/notificationHooks.js', () => ({ notificationHooks: jest.fn() }));

const categoryId = '507f1f77bcf86cd799439011';
const userId = '507f1f77bcf86cd799439012';
const otherId = '507f1f77bcf86cd799439013';
const response = () => { const res = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res); return res; };
const request = body => ({ params: { id: categoryId }, body });
let setOptions;
function referencedDocument(value) {
    setOptions = jest.fn().mockReturnValue({ select: () => ({ lean: async () => value }) });
    Doc.findOne.mockReturnValue({ setOptions });
}
beforeEach(() => {
    referencedDocument(null); Book.exists.mockResolvedValue(null);
    Category.findById.mockResolvedValue({ _id: categoryId, type: 'Document' });
    Category.findByIdAndUpdate.mockResolvedValue({ _id: categoryId, name: 'Changed', type: 'Document' });
    Category.findByIdAndDelete.mockResolvedValue({ _id: categoryId });
    Category.create.mockResolvedValue({ _id: categoryId });
});

describe('category validation and reference safety', () => {
    test('trims valid fields and defaults only optional values', () => {
        expect(categoryInput({ name: ' General ' })).toEqual({ name: 'General', description: '', type: 'Document' });
        expect(categoryInput({ name: ' Reference ', description: ' Books ', type: 'Book' })).toEqual({ name: 'Reference', description: 'Books', type: 'Book' });
    });
    test.each([
        {}, { name: '   ' }, { name: { $ne: null } }, { name: 'x'.repeat(101) },
        { name: 'Valid', description: 'x'.repeat(1001) }, { name: 'Valid', description: {} },
        { name: 'Valid', type: 'Admin' }, { name: 'Valid', type: ['Book'] }, null,
    ])('rejects invalid payload %p', body => { expect(() => categoryInput(body)).toThrow(); });
    test('rejects invalid create before database mutation', async () => {
        const res = response(); await createCategory(request({ name: ' ' }), res);
        expect(res.status).toHaveBeenCalledWith(400); expect(Category.create).not.toHaveBeenCalled();
    });
    test('maps a uniqueness race to conflict', async () => {
        Category.create.mockRejectedValue({ code: 11000 }); const res = response();
        await createCategory(request({ name: 'General' }), res); expect(res.status).toHaveBeenCalledWith(409);
    });
    test('includes soft-deleted documents when preventing category deletion', async () => {
        referencedDocument({ _id: otherId }); const res = response(); await deleteCategory(request(), res);
        expect(setOptions).toHaveBeenCalledWith({ includeDeleted: true });
        expect(res.status).toHaveBeenCalledWith(409); expect(Category.findByIdAndDelete).not.toHaveBeenCalled();
    });
    test('prevents deletion when any book references the category', async () => {
        Book.exists.mockResolvedValue({ _id: otherId }); const res = response(); await deleteCategory(request(), res);
        expect(Book.exists).toHaveBeenCalledWith({ category: categoryId }); expect(res.status).toHaveBeenCalledWith(409);
        expect(Category.findByIdAndDelete).not.toHaveBeenCalled();
    });
    test('allows deleting an unreferenced category and distinguishes missing category', async () => {
        const res = response(); await deleteCategory(request(), res); expect(Category.findByIdAndDelete).toHaveBeenCalledWith(categoryId); expect(res.status).not.toHaveBeenCalled();
        Category.findByIdAndDelete.mockResolvedValue(null); const missing = response(); await deleteCategory(request(), missing); expect(missing.status).toHaveBeenCalledWith(404);
    });
    test('prevents changing type while referenced but allows same-type metadata edits', async () => {
        referencedDocument({ _id: otherId }); const res = response(); await updateCategory(request({ name: 'Changed', type: 'Book' }), res);
        expect(res.status).toHaveBeenCalledWith(409); expect(Category.findByIdAndUpdate).not.toHaveBeenCalled();
        await updateCategory(request({ name: 'Changed', type: 'Document' }), response()); expect(Category.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    });
    test('allows changing an unused category type', async () => {
        await updateCategory(request({ name: 'Book category', type: 'Book' }), response());
        expect(Category.findByIdAndUpdate).toHaveBeenCalledWith(categoryId, { $set: { name: 'Book category', description: '', type: 'Book' } }, { new: true, runValidators: true });
    });
    test.each([updateCategory, deleteCategory])('invalid category IDs return 400 before querying', async handler => {
        const res = response(); await handler({ params: { id: 'invalid' }, body: { name: 'Valid' } }, res);
        expect(res.status).toHaveBeenCalledWith(400); expect(Category.findById).not.toHaveBeenCalled(); expect(Doc.findOne).not.toHaveBeenCalled();
    });
    test('normalizes pagination before accessing storage', async () => {
        const limit = jest.fn().mockResolvedValue([]), skip = jest.fn().mockReturnValue({ limit });
        Category.find.mockReturnValue({ sort: () => ({ skip }) }); Category.countDocuments.mockResolvedValue(0);
        const res = response(); await getAllCategories({ query: { limit: '-12', page: '-3', type: 'Book' } }, res);
        expect(limit).toHaveBeenCalledWith(1); expect(skip).toHaveBeenCalledWith(0); expect(Category.find).toHaveBeenCalledWith({ type: 'Book' });
    });
});

describe('populated team and project identity comparisons', () => {
    const populated = id => ({ _id: new mongoose.Types.ObjectId(id), firstname: 'Fixture' });
    test('team recognizes populated owner and members while denying an outsider', () => {
        const team = { owner: populated(categoryId), members: [{ user: populated(userId), role: 'admin' }, { user: null, role: 'admin' }] };
        expect(Team.schema.methods.isMember.call(team, categoryId)).toBe(true);
        expect(Team.schema.methods.isMember.call(team, new mongoose.Types.ObjectId(userId))).toBe(true);
        expect(Team.schema.methods.isAdmin.call(team, userId)).toBe(true);
        expect(Team.schema.methods.getUserRole.call(team, userId)).toBe('admin');
        expect(Team.schema.methods.isMember.call(team, otherId)).toBe(false);
        expect(Team.schema.methods.isAdmin.call(team, otherId)).toBe(false);
        expect(Team.schema.methods.getUserRole.call(team, otherId)).toBeNull();
    });
    test('ordinary team membership does not gain administrative authority', () => {
        const team = { owner: categoryId, members: [{ user: populated(userId), role: 'member' }] };
        expect(Team.schema.methods.isMember.call(team, userId)).toBe(true);
        expect(Team.schema.methods.isAdmin.call(team, userId)).toBe(false);
        expect(Team.schema.methods.getUserRole.call(team, userId)).toBe('member');
    });
    test('project recognizes populated owner and manager without granting outsiders access', () => {
        const project = { owner: populated(categoryId), collaborators: [{ user: populated(userId), role: 'manager' }, { user: null, role: 'manager' }] };
        expect(Project.schema.methods.isCollaborator.call(project, categoryId)).toBe(true);
        expect(Project.schema.methods.isCollaborator.call(project, new mongoose.Types.ObjectId(userId))).toBe(true);
        expect(Project.schema.methods.isManager.call(project, userId)).toBe(true);
        expect(Project.schema.methods.getUserRole.call(project, userId)).toBe('manager');
        expect(Project.schema.methods.isCollaborator.call(project, otherId)).toBe(false);
        expect(Project.schema.methods.isManager.call(project, otherId)).toBe(false);
        expect(Project.schema.methods.getUserRole.call(project, otherId)).toBeNull();
    });
    test('viewer collaborators remain readers rather than managers', () => {
        const project = { owner: categoryId, collaborators: [{ user: populated(userId), role: 'viewer' }] };
        expect(Project.schema.methods.isCollaborator.call(project, userId)).toBe(true);
        expect(Project.schema.methods.isManager.call(project, userId)).toBe(false);
        expect(Project.schema.methods.getUserRole.call(project, userId)).toBe('viewer');
    });
});


describe('management controller access boundaries', () => {
    const actor = role => ({ _id: new mongoose.Types.ObjectId(userId), role });
    function projectQuery(result) {
        const chain = { populate: jest.fn(), sort: jest.fn().mockResolvedValue(result), then: resolve => Promise.resolve(result).then(resolve) };
        chain.populate.mockReturnValue(chain);
        return chain;
    }
    test('project search preserves membership constraints for ordinary administrators', async () => {
        const user = actor('admin');
        jest.spyOn(Team, 'find').mockReturnValue({ select: () => ({ lean: async () => [{ _id: categoryId }] }) });
        const find = jest.spyOn(Project, 'find').mockReturnValue(projectQuery([]));
        const res = response();
        await getAllProjects({ user, query: { search: 'alpha' } }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(find).toHaveBeenCalledWith(expect.objectContaining({
            $and: [{ $or: [{ owner: user._id }, { 'collaborators.user': user._id }, { teams: { $in: [categoryId] } }] }],
            $or: [{ name: { $regex: 'alpha', $options: 'i' } }, { description: { $regex: 'alpha', $options: 'i' } }],
        }));
    });
    test.each([['admin', false, 403], ['viewer', true, 200], ['superadmin', false, 200]])(
        'project detail access for %s with direct membership %s returns %s', async (role, member, status) => {
            const project = { teams: [], isCollaborator: jest.fn().mockReturnValue(member) };
            jest.spyOn(Project, 'findById').mockReturnValue(projectQuery(project));
            const res = response();
            await getProjectById({ params: { id: categoryId }, user: actor(role) }, res);
            expect(res.status).toHaveBeenCalledWith(status);
            if (status === 403) expect(res.json).not.toHaveBeenCalledWith(project);
        }
    );
    test('book deletion denies non-owner administrators before association cleanup', async () => {
        Book.findById.mockResolvedValue({ _id: categoryId, isOwner: () => false });
        const teams = jest.spyOn(Team, 'updateMany').mockResolvedValue({});
        const projects = jest.spyOn(Project, 'updateMany').mockResolvedValue({});
        const res = response();
        await deleteBook({ params: { id: categoryId }, user: actor('admin') }, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(teams).not.toHaveBeenCalled(); expect(projects).not.toHaveBeenCalled();
        expect(Book.findByIdAndDelete).not.toHaveBeenCalled();
    });
    test('book deletion removes team and project links without deleting documents', async () => {
        Book.findById.mockResolvedValue({ _id: categoryId, isOwner: () => true });
        const teams = jest.spyOn(Team, 'updateMany').mockResolvedValue({});
        const projects = jest.spyOn(Project, 'updateMany').mockResolvedValue({});
        Book.findByIdAndDelete.mockResolvedValue({});
        const res = response();
        await deleteBook({ params: { id: categoryId }, user: actor('editor') }, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(teams).toHaveBeenCalledWith({ books: categoryId }, { $pull: { books: categoryId } });
        expect(projects).toHaveBeenCalledWith({ books: categoryId }, { $pull: { books: categoryId } });
        expect(Book.findByIdAndDelete).toHaveBeenCalledWith(categoryId);
        expect(Doc.findOne).not.toHaveBeenCalled();
    });
});
