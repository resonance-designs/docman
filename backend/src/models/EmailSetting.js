import mongoose from 'mongoose';

// Separate from generic system settings: secrets are an authenticated ciphertext envelope.
const schema = new mongoose.Schema({
    _id: { type: String, default: 'outbound' },
    revision: { type: Number, required: true, default: 1 },
    config: { type: mongoose.Schema.Types.Mixed, required: true },
    encryptedSecrets: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, minimize: false });
export default mongoose.model('EmailSetting', schema);
