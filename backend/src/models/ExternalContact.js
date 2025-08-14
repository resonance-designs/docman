import mongoose from "mongoose";

const externalContactSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        phoneNumber: {
            type: String,
            required: false
        },
        type: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExternalContactType',
            required: true
        },
        documentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
            required: false
        }
    },
    { timestamps: true }
);

const ExternalContact = mongoose.model("ExternalContact", externalContactSchema);

export default ExternalContact;