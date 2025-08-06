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
        author: {
            type: String,
            required: true
        }
    },
    { timestamps: true } // createdAt and updatedAt fields
);

const Doc = mongoose.model("Document", docSchema);

export default Doc;