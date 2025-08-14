/*
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
import mongoose from "mongoose";

const externalContactTypeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true
        },
        description: {
            type: String,
            required: false
        }
    },
    { timestamps: true }
);

const ExternalContactType = mongoose.model("ExternalContactType", externalContactTypeSchema);

export default ExternalContactType;