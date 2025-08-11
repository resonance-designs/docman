import File from "../models/File.js";  // Your file schema/model
import Doc from "../models/Doc.js";    // Your document schema/model
import path from "path";

export async function uploadFileVersion(req, res) {
  try {
    const docId = req.params.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Verify the document exists
    const doc = await Doc.findById(docId);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Create a new File document linked to the Doc
    const newFile = new File({
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      documentId: doc._id, // Link to parent document
      uploadedAt: new Date(),
    });

    await newFile.save();

    res.status(201).json({ message: "File version uploaded successfully", file: newFile });
  } catch (error) {
    console.error("Error uploading file version:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
