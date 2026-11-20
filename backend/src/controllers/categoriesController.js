import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Doc from '../models/Doc.js';
import Book from '../models/Book.js';
const validId = id => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
export function categoryInput(body = {}) {
    const { name, description = '', type = 'Document' } = body;
    if (typeof name !== 'string' || !name.trim() || name.length > 100 || typeof description !== 'string' || description.length > 1000 || !['Document','Book'].includes(type)) throw new Error('Enter a name (up to 100 characters), description (up to 1000), and Document or Book type.');
    return { name: name.trim(), description: description.trim(), type };
}
async function referenced(id) {
    return Boolean(await Doc.findOne({ category: id }).setOptions({ includeDeleted: true }).select('_id').lean() || await Book.exists({ category: id }));
}
function failure(res, error) { return res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? 'Category name already exists.' : 'Could not save category.' }); }
export async function getAllCategories(req,res) {
    try {
        const limit = Math.max(1,Math.min(Number.parseInt(req.query.limit) || 50,100)), page = Math.max(1,Number.parseInt(req.query.page)||1);
        const filter = ['Document','Book'].includes(req.query.type) ? {type:req.query.type}:{};
        const [categories,total] = await Promise.all([Category.find(filter).sort({name:1}).skip((page-1)*limit).limit(limit),Category.countDocuments(filter)]);
        res.json({categories,pagination:{total,page,limit,pages:Math.ceil(total/limit)}});
    } catch { res.status(500).json({message:'Could not load categories.'}); }
}
export async function createCategory(req,res) {
    let data; try { data=categoryInput(req.body); } catch(e) { return res.status(400).json({message:e.message}); }
    try { const category=await Category.create(data);return res.status(201).json({message:'Category created.',category}); } catch(e) { return failure(res,e); }
}
export async function updateCategory(req,res) {
    if(!validId(req.params.id)) return res.status(400).json({message:'Invalid category ID.'});
    let data;try {data=categoryInput(req.body);}catch(e){return res.status(400).json({message:e.message});}
    try {
        const current=await Category.findById(req.params.id);
        if(!current) return res.status(404).json({message:'Category not found.'});
        if(current.type!==data.type && await referenced(current._id)) return res.status(409).json({message:'This category is in use. Reassign its documents/books before changing its type.'});
        const category=await Category.findByIdAndUpdate(current._id,{$set:data},{new:true,runValidators:true});
        return res.json({message:'Category updated.',category});
    } catch(e){return failure(res,e);}
}
export async function deleteCategory(req,res) {
    if(!validId(req.params.id)) return res.status(400).json({message:'Invalid category ID.'});
    try {
        if(await referenced(req.params.id)) return res.status(409).json({message:'This category is in use, including retained deleted documents. Reassign its documents/books before deleting it.'});
        const category=await Category.findByIdAndDelete(req.params.id);
        if(!category) return res.status(404).json({message:'Category not found.'});
        return res.json({message:'Category deleted.'});
    } catch(e){return failure(res,e);}
}
