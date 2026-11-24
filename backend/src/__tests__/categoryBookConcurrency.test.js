import SystemSetting from '../models/SystemSetting.js';
import Category from '../models/Category.js';
import Doc from '../models/Doc.js';
import Book from '../models/Book.js';
import { createBook, updateBook } from '../controllers/booksController.js';
import { deleteCategory, updateCategory } from '../controllers/categoriesController.js';
import { createDocument, updateDocument } from '../services/documentService.js';
jest.mock('../models/SystemSetting.js', () => ({ __esModule:true, default:{findOneAndUpdate:jest.fn(),updateOne:jest.fn()} }));
jest.mock('../models/Category.js', () => ({ __esModule:true, default:{exists:jest.fn(),findById:jest.fn(),findByIdAndUpdate:jest.fn(),findByIdAndDelete:jest.fn()} }));
jest.mock('../models/Doc.js', () => ({ __esModule:true, default:Object.assign(jest.fn(),{findOne:jest.fn(),findById:jest.fn(),findByIdAndUpdate:jest.fn()}) }));
jest.mock('../models/Book.js', () => ({ __esModule:true, default:Object.assign(jest.fn(),{exists:jest.fn(),findById:jest.fn()}) }));
jest.mock('../lib/notificationHooks.js', () => ({notificationHooks:jest.fn()}));
jest.mock('../services/revisionService.js', () => ({recordRevision:jest.fn(async()=>({changes:[]})),snapshotDocument:jest.fn(x=>x)}));
jest.mock('../services/auditService.js', () => ({record:jest.fn(),AUDIT_ACTIONS:{}}));
jest.mock('../services/approvalService.js', () => ({submitVersion:jest.fn()}));
jest.mock('../controllers/reviewController.js', () => ({}));
const id='507f1f77bcf86cd799439011', actor='507f1f77bcf86cd799439012';
const req=body=>({params:{id},body,user:{id:actor,_id:actor,role:'superadmin'}});
const response=()=>{const res={status:jest.fn(),json:jest.fn()};res.status.mockReturnValue(res);return res;};
let held, category, saved, release, entered, save;
beforeEach(()=>{
    held=null; category={_id:id,type:'Book'}; saved=false;
    SystemSetting.findOneAndUpdate.mockImplementation(async(filter,update)=>{
        if(held) throw Object.assign(new Error('busy'),{code:11000});
        held=update.$set.value;
        expect(filter.$or).toHaveLength(1);
        expect(held.expiresAt).toBeUndefined();
        return {value:held};
    });
    SystemSetting.updateOne.mockImplementation(async filter=>{if(held?.holder===filter['value.holder']) held=null;});
    Category.findById.mockImplementation(async()=>category);
    Category.exists.mockImplementation(async filter=>category?.type===filter.type);
    Category.findByIdAndDelete.mockImplementation(async()=>{const old=category;category=null;return old;});
    Category.findByIdAndUpdate.mockImplementation(async()=>category);
    Doc.findOne.mockReturnValue({setOptions:()=>({select:()=>({lean:async()=>null})})});
    Book.exists.mockImplementation(async()=>saved);
    entered=new Promise(resolve=>{
        save=jest.fn(()=>{resolve();return new Promise(done=>{release=()=>{saved=true;done();};});});
    });
    Book.mockImplementation(()=>({_id:id,save}));
    const query={populate:jest.fn()};query.populate.mockReturnValue(query);
    Book.findById.mockReturnValue(query);
});

test.each(['create', 'update'])('document %s keeps category guard through the write', async action => {
    category.type = 'Document';
    const document = { _id:id, author:actor, category:id, title:'Document', save, populate:jest.fn() };
    Doc.mockImplementation(()=>document);
    Doc.findById.mockResolvedValue(document);
    Doc.findByIdAndUpdate.mockImplementation(()=>({populate:async()=>{await save();return document;}}));
    const user={id:actor,_id:actor,role:'superadmin'};
    const pending=action==='create'?createDocument({title:'Document',category:id,author:actor},null,user):updateDocument(id,{category:id},null,user);
    await entered;
    const res=response(); await deleteCategory(req({}),res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(Category.findByIdAndDelete).not.toHaveBeenCalled();
    release(); await pending;
    expect(held).toBeNull();
});

test('document creation rejects deleted or wrong-type category before save', async()=>{
    category=null;
    await expect(createDocument({category:id},null,{id:actor})).rejects.toMatchObject({statusCode:400});
    expect(save).not.toHaveBeenCalled();
    expect(held).toBeNull();
});
test.each(['delete','type change'])('book creation holds guard through save against category %s',async action=>{
    const created=response();const pending=createBook(req({title:'Book',category:id}),created);
    await entered;
    const competing=response();
    const mutate=action==='delete'?deleteCategory:updateCategory;
    await mutate(req({name:'Changed',type:'Document'}),competing);
    expect(competing.status).toHaveBeenCalledWith(409);
    expect(Category.findByIdAndDelete).not.toHaveBeenCalled();
    expect(Category.findByIdAndUpdate).not.toHaveBeenCalled();
    release();await pending;
    expect(created.status).toHaveBeenCalledWith(201);
    const retry=response();await mutate(req({name:'Changed',type:'Document'}),retry);
    expect(retry.status).toHaveBeenCalledWith(409);
});
test('creation rechecks category after deletion has completed',async()=>{
    await deleteCategory(req({}),response());
    const res=response();await createBook(req({title:'Book',category:id}),res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(save).not.toHaveBeenCalled();
    expect(held).toBeNull();
});
test('book reassignment also holds guard until save completes',async()=>{
    const book={_id:id,category:'507f1f77bcf86cd799439013',isOwner:()=>true,save};
    Book.findById.mockResolvedValueOnce(book);
    const updated=response();const pending=updateBook(req({category:id}),updated);
    await entered;
    const res=response();await deleteCategory(req({}),res);
    expect(res.status).toHaveBeenCalledWith(409);
    release();await pending;
    expect(updated.status).toHaveBeenCalledWith(200);
    expect(book.category).toBe(id);
    expect(held).toBeNull();
});
