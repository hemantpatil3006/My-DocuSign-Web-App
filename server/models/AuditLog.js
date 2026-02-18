const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    document: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['UPLOAD', 'VIEW', 'SIGN', 'FINALIZE', 'REJECT', 'DOWNLOAD', 'SHARE']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    userEmail: {
        type: String
    },
    signerName: {
        type: String
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    details: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
