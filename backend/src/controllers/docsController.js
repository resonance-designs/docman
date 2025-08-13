// backend/src/controllers/docsController.js
import Doc from "../models/Doc.js";
import File from "../models/File.js";
import { areAllObjectFieldsEmpty } from "../lib/utils.js";

export async function getAllDocs(req, res) {
    try {
        // Read optional ?limit=5 from the query string
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

        // Build the query with population
        let query = Doc.find()
            .populate('author', 'firstname lastname email')
            .populate('category', 'name')
            .populate('stakeholders', 'firstname lastname email')
            .populate('owners', 'firstname lastname email')
            .sort({ createdAt: -1 });

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
        const doc = await Doc.findById(req.params.id)
            .populate('author', 'firstname lastname email')
            .populate('category', 'name')
            .populate('stakeholders', 'firstname lastname email')
            .populate('owners', 'firstname lastname email');

        if (!doc) return res.status(404).json({ message: "Document not found." });
        res.status(200).json(doc);
    } catch (error) {
        console.error("Error fetching document by ID:", error);
        res.status(500).send("Internal Server Error");
    }
}

export async function createDoc(req, res) {
    try {
        const { title, description, reviewDate, author, category, stakeholders, owners } = req.body;
        const file = req.file;

        if (!title || !description || !reviewDate || !author || !category) {
            return res.status(400).json({ message: "Title, description, reviewDate, author, and category are required." });
        }

        // Parse stakeholders and owners if they exist
        let stakeholdersArray = [];
        let ownersArray = [];

        if (stakeholders) {
            try {
                stakeholdersArray = JSON.parse(stakeholders);
            } catch (error) {
                console.error("Error parsing stakeholders:", error);
                return res.status(400).json({ message: "Invalid stakeholders format" });
            }
        }

        if (owners) {
            try {
                ownersArray = JSON.parse(owners);
            } catch (error) {
                console.error("Error parsing owners:", error);
                return res.status(400).json({ message: "Invalid owners format" });
            }
        }

        // Create the document entry
        const newDoc = new Doc({
            title,
            description,
            reviewDate,
            author,
            category,
            stakeholders: stakeholdersArray,
            owners: ownersArray
        });

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

        // Populate the response
        const populatedDoc = await Doc.findById(newDoc._id)
            .populate('author', 'firstname lastname email')
            .populate('category', 'name')
            .populate('stakeholders', 'firstname lastname email')
            .populate('owners', 'firstname lastname email');

        res.status(201).json({ message: "Document created successfully", doc: populatedDoc });
    } catch (error) {
        console.error("Error creating document:", error);
        res.status(500).send("Internal Server Error");
    }
}

export async function updateDoc(req, res) {
    try {
        const { title, description, reviewDate, author, category, stakeholders, owners } = req.body;
        const docObject = req.body;
        const objectIsEmpty = areAllObjectFieldsEmpty(docObject);

        if (objectIsEmpty) {
            return res.status(400).json({message: "No fields were changed."});
        }

        // Parse arrays if they exist
        let updateData = { title, description, reviewDate, author, category };

        if (stakeholders) {
            try {
                updateData.stakeholders = JSON.parse(stakeholders);
            } catch (error) {
                console.error("Error parsing stakeholders:", error);
                return res.status(400).json({ message: "Invalid stakeholders format" });
            }
        }

        if (owners) {
            try {
                updateData.owners = JSON.parse(owners);
            } catch (error) {
                console.error("Error parsing owners:", error);
                return res.status(400).json({ message: "Invalid owners format" });
            }
        }

        const updatedDoc = await Doc.findByIdAndUpdate(req.params.id, updateData, {new: true})
            .populate('author', 'firstname lastname email')
            .populate('category', 'name')
            .populate('stakeholders', 'firstname lastname email')
            .populate('owners', 'firstname lastname email');

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