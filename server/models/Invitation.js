const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
    document: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['Signer', 'Witness', 'Approver', 'Viewer'],
        default: 'Signer',
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Rejected'],
        default: 'Pending'
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    }
}, {
    timestamps: true,
    collection: 'invitations',
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

invitationSchema.virtual('isExpired').get(function() {
    return this.expiresAt && Date.now() > this.expiresAt;
});

module.exports = mongoose.model('Invitation', invitationSchema);
