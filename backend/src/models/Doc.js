// backend/src/models/Doc.js
import mongoose from "mongoose";

const docSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        reviewDate: {
            type: Date,
            required: true
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true
        },
        stakeholders: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        owners: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },
    { timestamps: true } // createdAt and updatedAt fields
);

const Doc = mongoose.model("Document", docSchema);

export default Doc;