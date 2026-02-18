const mongoose = require('mongoose');

const signatureSchema = new mongoose.Schema({
    document: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    signerEmail: {
        type: String
    },
    signerName: {
        type: String
    },
    page: {
        type: Number,
        required: true
    },
    x: {
        type: Number,
        required: true
    },
    y: {
        type: Number,
        required: true
    },
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    },
    signatureData: {
        type: String
    },
    signedAt: {
        type: Date
    }
}, {
    timestamps: true,
    collection: 'signatures'
});

module.exports = mongoose.model('Signature', signatureSchema);
