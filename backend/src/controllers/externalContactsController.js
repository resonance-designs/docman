/*
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */
import ExternalContact from "../models/ExternalContact.js";
import ExternalContactType from "../models/ExternalContactType.js";
import Doc from "../models/Doc.js";

/**
 * Get all external contact types
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of contact types or error message
 */
export async function getAllExternalContactTypes(req, res) {
    try {
        const contactTypes = await ExternalContactType.find();
        res.status(200).json(contactTypes);
    } catch (error) {
        console.error("Error fetching external contact types:", error);
        res.status(500).send("Internal Server Error");
    }
}

/**
 * Create a new external contact type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created contact type data or error message
 */
export async function createExternalContactType(req, res) {
    try {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: "Name is required for external contact type" });
        }
        
        const contactType = new ExternalContactType({
            name,
            description
        });
        
        await contactType.save();
        res.status(201).json(contactType);
    } catch (error) {
        console.error("Error creating external contact type:", error);
        res.status(500).send("Internal Server Error");
    }
}

/**
 * Get all external contacts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of contacts or error message
 */
export async function getAllExternalContacts(req, res) {
    try {
        const contacts = await ExternalContact.find();
        res.status(200).json(contacts);
    } catch (error) {
        console.error("Error fetching external contacts:", error);
        res.status(500).send("Internal Server Error");
    }
}

/**
 * Create a new external contact
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created contact data or error message
 */
export async function createExternalContact(req, res) {
    try {
        const { name, email, phoneNumber, type, documentId } = req.body;
        
        if (!name || !email || !type) {
            return res.status(400).json({ message: "Name, email, and type are required for external contact" });
        }
        
        const contact = new ExternalContact({
            name,
            email,
            phoneNumber,
            type,
            documentId
        });
        
        await contact.save();
        
        // If documentId is provided, add the contact to the document
        if (documentId) {
            await Doc.findByIdAndUpdate(documentId, {
                $push: { externalContacts: contact._id }
            });
        }
        
        res.status(201).json(contact);
    } catch (error) {
        console.error("Error creating external contact:", error);
        res.status(500).send("Internal Server Error");
    }
}

/**
 * Get external contacts by document ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with array of contacts or error message
 */
export async function getExternalContactsByDocument(req, res) {
    try {
        const { id } = req.params;
        const contacts = await ExternalContact.find({ documentId: id });
        res.status(200).json(contacts);
    } catch (error) {
        console.error("Error fetching external contacts by document:", error);
        res.status(500).send("Internal Server Error");
    }
}

/**
 * Update an external contact
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated contact data or error message
 */
export async function updateExternalContact(req, res) {
    try {
        const { id } = req.params;
        const { name, email, phoneNumber, type } = req.body;
        
        const contact = await ExternalContact.findByIdAndUpdate(
            id,
            { name, email, phoneNumber, type },
            { new: true }
        );
        
        if (!contact) {
            return res.status(404).json({ message: "External contact not found" });
        }
        
        res.status(200).json(contact);
    } catch (error) {
        console.error("Error updating external contact:", error);
        res.status(500).send("Internal Server Error");
    }
}

/**
 * Update an external contact type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated contact type data or error message
 */
export async function updateExternalContactType(req, res) {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: "Name is required for external contact type" });
        }
        
        const contactType = await ExternalContactType.findByIdAndUpdate(
            id,
            { name, description },
            { new: true }
        );
        
        if (!contactType) {
            return res.status(404).json({ message: "External contact type not found" });
        }
        
        res.status(200).json(contactType);
    } catch (error) {
        console.error("Error updating external contact type:", error);
        res.status(500).send("Internal Server Error");
    }
}

/**
 * Delete an external contact type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function deleteExternalContactType(req, res) {
    try {
        const { id } = req.params;
        
        const contactType = await ExternalContactType.findByIdAndDelete(id);
        
        if (!contactType) {
            return res.status(404).json({ message: "External contact type not found" });
        }
        
        res.status(200).json({ message: "External contact type deleted successfully" });
    } catch (error) {
        console.error("Error deleting external contact type:", error);
        res.status(500).send("Internal Server Error");
    }
}

/**
 * Delete an external contact
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
export async function deleteExternalContact(req, res) {
    try {
        const { id } = req.params;
        
        const contact = await ExternalContact.findByIdAndDelete(id);
        
        if (!contact) {
            return res.status(404).json({ message: "External contact not found" });
        }
        
        // Remove from document if it was associated with one
        if (contact.documentId) {
            await Doc.findByIdAndUpdate(contact.documentId, {
                $pull: { externalContacts: contact._id }
            });
        }
        
        res.status(200).json({ message: "External contact deleted successfully" });
    } catch (error) {
        console.error("Error deleting external contact:", error);
        res.status(500).send("Internal Server Error");
    }
}