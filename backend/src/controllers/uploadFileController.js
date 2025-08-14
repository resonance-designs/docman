/*
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import File from "../models/File.js";  // Your file schema/model
import Doc from "../models/Doc.js";    // Your document schema/model
import path from "path";

/**
 * Upload a new version of a file for a document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with uploaded file data or error message
 */
export async function uploadFileVersion(req, res) {
  try {
    const docId = req.params.id;
    const file = req.file;
    const { versionLabel, changelog } = req.body;

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
      versionLabel: versionLabel || undefined, // Use provided label or let model set default
      uploadedAt: new Date(),
      uploadedBy: req.user?.id || null,
      changelog: changelog || ""
    });

    await newFile.save();

    // Update document's current version and version history
    doc.currentVersion = newFile.version;
    
    // Add to version history
    doc.versionHistory = doc.versionHistory || [];
    doc.versionHistory.push({
      version: newFile.version,
      label: newFile.versionLabel,
      uploadedAt: newFile.uploadedAt,
      uploadedBy: newFile.uploadedBy,
      changelog: newFile.changelog
    });
    
    await doc.save();

    res.status(201).json({
      message: "File version uploaded successfully",
      file: newFile,
      document: doc
    });
  } catch (error) {
    console.error("Error uploading file version:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
