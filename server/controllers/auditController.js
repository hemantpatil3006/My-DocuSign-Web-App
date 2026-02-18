const AuditLog = require('../models/AuditLog');

exports.logAction = async (docId, action, req, details = '', overrideEmail = null, overrideName = null) => {
    try {
        const rawEmail = overrideEmail || req.body?.signerEmail || req.query?.signerEmail;
        const rawName = overrideName || req.body?.signerName || req.query?.signerName;
        
        const detectedEmail = (rawEmail && rawEmail.trim() !== '') ? rawEmail : null;
        const detectedName = (rawName && rawName.trim() !== '') ? rawName : null;
        
        console.log(`[AUDIT] Action: ${action} | Guest: ${detectedName} (${detectedEmail}) | Session: ${req.user?.userId}`);

        await new AuditLog({
            document: docId,
            action,
            user: detectedEmail ? null : (req.user ? req.user.userId : null),
            userEmail: detectedEmail || (req.user ? req.user.email : 'Guest'),
            signerName: detectedName,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details
        }).save();
    } catch (error) {
        console.error('Audit Log Error:', error);
    }
};

exports.getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find({ document: req.params.docId })
            .sort({ createdAt: -1 })
            .populate('user', 'name email');
        res.json(logs);
    } catch (error) {
        console.error('Get Audit Logs Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
