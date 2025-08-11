import Doc from "../models/Doc.js";
import File from "../models/File.js"; // Make sure you have this model defined
import { areAllObjectFieldsEmpty } from "../lib/utils.js";

export async function getAllDocs(req, res) {
    try {
        // Read optional ?limit=5 from the query string
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

        // Build the query
        let query = Doc.find().sort({ createdAt: -1 });

        // Apply limit only if provided
        if (limit && !isNaN(limit)) {
            query = query.limit(limit);
        }

        const docs = await query;

        if (!docs || docs.length === 0) {
            return res.status(404).json({ message: "No documents found." });
        } else {
            res.status(200).json(docs);
        }
    } catch (error) {
        console.error("Error fetching documents:", error);
        res.status(500).send("Internal Server Error");
    }
}


export async function getDocById(req, res) {
    try {
        const doc = await Doc.findById(req.params.id);
        if (!doc) return res.status(404).json({ message: "Document not found." });
        res.status(200).json(doc);
    } catch (error) {
        console.error("Error fetching document by ID:", error);
        res.status(500).send("Internal Server Error");
    }
}

export async function createDoc(req, res) {
  try {
        const { title, description, author } = req.body;
        const file = req.file;

        if (!title || !description || !author) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Create the document entry
        const newDoc = new Doc({ title, description, author });
        await newDoc.save();

        // If a file was uploaded, save the file metadata
        if (file) {
            const newFile = new File({
                filename: file.filename,
                originalname: file.originalname,
                path: file.path,
                mimetype: file.mimetype,
                size: file.size,
                documentId: newDoc._id,
                uploadedAt: new Date(),
            });
            await newFile.save();
        }
        res.status(201).json({ message: "Document created successfully", doc: newDoc });
    } catch (error) {
        console.error("Error creating document:", error);
        res.status(500).send("Internal Server Error");
    }
}


export async function updateDoc(req, res) {
    try {
        const { title, description, author } = req.body;
        const docObject = req.body;
        const objectIsEmpty = areAllObjectFieldsEmpty(docObject);
        if (objectIsEmpty) {
            return res.status(400).json({message: "No fields were changed."});
        }
        const updatedDoc = await Doc.findByIdAndUpdate(req.params.id, { title, description, author }, {new: true});
        if (!updatedDoc) {
            return res.status(404).json({ message: "Document not found."});
        }
        res.status(200).json({ message: "Document updated successfully", doc: updatedDoc });
    } catch (error) {
        console.error("Error updating document:", error);
        res.status(500).send("Internal Server Error");
    }
}

export async function deleteDoc(req, res) {
    try {
        const deletedDoc = await Doc.findByIdAndDelete(req.params.id);
        if (!deletedDoc) {
            return res.status(404).json({ message: "Document not found." });
        }
        res.status(200).json({ message: "Document deleted successfully" });
    } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).send("Internal Server Error");
    }
}