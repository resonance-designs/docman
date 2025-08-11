import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    originalname: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Doc", required: true },
    uploadedAt: { type: Date, default: Date.now },
});

fileSchema.index({ documentId: 1 });

export default mongoose.model("File", fileSchema);

