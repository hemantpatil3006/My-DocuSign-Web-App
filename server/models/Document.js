const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    originalUrl: {
        type: String,
        required: true
    },
    signedUrl: {
        type: String
    },
    shareToken: {
        type: String,
        unique: true,
        sparse: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Signed', 'Rejected'],
        default: 'Pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Document', documentSchema);
