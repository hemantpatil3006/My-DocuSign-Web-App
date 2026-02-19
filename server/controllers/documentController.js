const Document = require('../models/Document');
const Invitation = require('../models/Invitation');
const crypto = require('crypto');
const { logAction } = require('./auditController');
const { sendInvitationEmail } = require('../utils/email');
const cloudinary = require('../utils/cloudinary');
const streamifier = require('streamifier');

exports.uploadDocument = async (req, res) => {
    console.log('\n========== UPLOAD REQUEST RECEIVED ==========');
    
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error('CRITICAL: Cloudinary environment variables are missing!');
        return res.status(500).json({ 
            message: 'Server configuration error: Cloudinary credentials missing',
            details: 'Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your environment variables.'
        });
    }

    console.log('User ID:', req.user ? req.user.userId : 'UNDEFINED');
    console.log('Has File:', !!req.file);
    if (req.file) {
        console.log('File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        });
    }

    try {
        if (!req.file) {
            console.error('Upload Error: No file provided by Multer');
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log('Uploading file to Cloudinary...');
        const cloudinaryUrl = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { resource_type: 'raw', type: 'upload', folder: 'docusign-uploads' },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result.secure_url);
                }
            );
            streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
        console.log('✓ Uploaded to Cloudinary:', cloudinaryUrl);

        const newDoc = new Document({
            owner: req.user.userId,
            filename: req.file.originalname,
            originalUrl: cloudinaryUrl,
            status: 'Pending'
        });

        console.log('Saving document to DB...');
        await newDoc.save();
        console.log('✓ Document saved to DB. ID:', newDoc._id);

        await logAction(newDoc._id, 'UPLOAD', req, `Uploaded ${newDoc.filename}`);
        console.log('✓ Action logged. Sending success response.');
        console.log('=============================================\n');

        res.status(201).json(newDoc);
    } catch (error) {
        console.error('\n!!!!!!!!!! UPLOAD SERVER ERROR !!!!!!!!!!');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
        res.status(500).json({ 
            message: 'Server error during upload', 
            error: error.message,
            tip: 'Check your Cloudinary credentials on Render.' 
        });
    }
};

exports.getDocuments = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        console.log(`[DEBUG] getDocuments: Fetching for user ${req.user.userId}`);
        const docs = await Document.aggregate([
            { $match: { owner: new mongoose.Types.ObjectId(req.user.userId) } },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'invitations',
                    localField: '_id',
                    foreignField: 'document',
                    as: 'invitations'
                }
            },
            {
                $lookup: {
                    from: 'signatures',
                    localField: '_id',
                    foreignField: 'document',
                    as: 'signatures'
                }
            },
            {
                $project: {
                    filename: 1,
                    originalUrl: 1,
                    status: 1,
                    createdAt: 1,
                    invitations: {
                        $map: {
                            input: "$invitations",
                            as: "inv",
                            in: {
                                name: "$$inv.name",
                                email: "$$inv.email",
                                role: "$$inv.role",
                                status: "$$inv.status"
                            }
                        }
                    },
                    signatures: {
                        $map: {
                            input: "$signatures",
                            as: "sig",
                            in: {
                                signerName: "$$sig.signerName",
                                signerEmail: "$$sig.signerEmail",
                                hasSignature: { $cond: [ { $gt: [ { $strLenCP: { $ifNull: ["$$sig.signatureData", ""] } }, 0 ] }, true, false ] }
                            }
                        }
                    }
                }
            }
        ]);
        
        console.log(`[DEBUG] getDocuments: Found ${docs.length} documents for user ${req.user.userId}`);
        docs.forEach(d => {
            if (d.invitations && d.invitations.length > 0) {
                console.log(`  - Doc ${d._id} has ${d.invitations.length} invitations`);
            }
        });

        res.json(docs);
    } catch (error) {
        console.error('Get Documents Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDocumentById = async (req, res) => {
    try {

        const doc = await Document.findById(req.params.id);
        
        if (!doc) {

            return res.status(404).json({ message: 'Document not found' });
        }


        const { token } = req.query;
        const userId = req.user ? req.user.userId : null;

        const isOwner = userId && doc.owner.toString() === userId;
        const isAuthorizedGuest = token && doc.shareToken === token;



        if (!isOwner && !isAuthorizedGuest) {
             return res.status(403).json({ message: 'Not authorized' });
        }

        const { signerEmail } = req.query;
        await logAction(doc._id, 'VIEW', req, isAuthorizedGuest ? 'Viewed via public link (Guest)' : 'Viewed document', signerEmail);
        
        // Fetch detailed status info for the owner
        let responseData = doc.toObject();
        if (isOwner) {
            const invitations = await Invitation.find({ document: doc._id });
            const signatures = await require('../models/Signature').find({ document: doc._id });
            console.log(`[DEBUG] Loaded ${invitations.length} invitations and ${signatures.length} signatures for doc ${doc._id}`);
            responseData.invitations = invitations;
            responseData.signatures = signatures;
        }

        res.json(responseData);
    } catch (error) {
        console.error('Get Document Error:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

exports.downloadDocument = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const { token } = req.query;
        const isOwner = req.user && doc.owner.toString() === req.user.userId;
        const isAuthorizedGuest = token && doc.shareToken === token;

        if (!isOwner && !isAuthorizedGuest) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const fileUrl = (doc.status === 'Signed' && doc.signedUrl) ? doc.signedUrl : doc.originalUrl;
        const downloadFilename = (doc.status === 'Signed' && doc.signedUrl)
            ? `signed-${doc.filename}`
            : doc.filename;

        const { signerEmail } = req.query;
        await logAction(doc._id, 'DOWNLOAD', req, 'Downloaded document', signerEmail);

        // Redirect to Cloudinary URL for download
        res.redirect(fileUrl);
    } catch (error) {
        console.error('Download Document Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (doc.owner.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Delete from Cloudinary if URL is a Cloudinary URL
        const deleteFromCloudinary = async (url) => {
            if (url && url.includes('cloudinary.com')) {
                const publicId = url.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '');
                try { await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }); } catch (e) { console.error('Cloudinary delete error:', e.message); }
            }
        };
        await deleteFromCloudinary(doc.originalUrl);
        await deleteFromCloudinary(doc.signedUrl);

        await doc.deleteOne();
        res.json({ message: 'Document removed' });
    } catch (error) {
        console.error('Delete Document Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.generateShareLink = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) return res.status(404).json({ message: 'Document not found' });
        
        if (doc.owner.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (doc.status !== 'Pending') {
            return res.status(400).json({ message: `Cannot share a ${doc.status} document for signing` });
        }

        if (!doc.shareToken) {
            doc.shareToken = crypto.randomBytes(32).toString('hex');
            await doc.save();
        }

        const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/sign/${doc.shareToken}`;
        
        await logAction(doc._id, 'SHARE', req, `Generated share link`);
        res.json({ shareToken: doc.shareToken, shareUrl });
    } catch (error) {
        console.error('Share Link Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDocumentByToken = async (req, res) => {
    try {
        const { token } = req.params;
        
        // First try finding an Invitation
        let invitation = await Invitation.findOne({ token }).populate('document');
        let doc;
        let role = 'Signer'; // Default role if using old shareToken

        if (invitation) {
            if (invitation.isExpired && invitation.status === 'Pending') {
                return res.status(410).json({ message: 'This invitation link has expired. Please ask the owner to send a new invitation.' });
            }
            doc = await Document.findById(invitation.document._id).populate('owner', 'name email');
            role = invitation.role;
        } else {
            // Fallback to old generic shareToken logic
            doc = await Document.findOne({ shareToken: token }).populate('owner', 'name email');
        }
        
        if (!doc) {
            return res.status(404).json({ message: 'Invalid or expired link' });
        }

        await logAction(doc._id, 'VIEW', req, `Viewed via link as ${invitation ? invitation.role : 'Guest'}`);
        
        // Return document along with role
        res.json({
            ...doc.toObject(),
            guestRole: role,
            guestName: invitation ? invitation.name : '',
            guestEmail: invitation ? invitation.email : ''
        });
    } catch (error) {
        console.error('Get Document by Token Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.inviteGuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role } = req.body;

        if (!name || !email || !role) {
            return res.status(400).json({ message: 'Name, email, and role are required' });
        }

        const doc = await Document.findById(id).populate('owner', 'name');
        console.log(`[DEBUG] inviteGuest: Sending invitation for doc ${id}. Found doc: ${!!doc}`);
        if (!doc) return res.status(404).json({ message: 'Document not found' });

        if (doc.owner._id.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Check if an active (pending and not expired) invitation already exists for this email
        const existingInvitation = await Invitation.findOne({
            document: id,
            email: email.toLowerCase(),
            status: 'Pending',
            expiresAt: { $gt: new Date() }
        });

        if (existingInvitation) {
            return res.status(400).json({ 
                message: `An active invitation has already been sent to ${email}. It will expire on ${existingInvitation.expiresAt.toLocaleDateString()}.` 
            });
        }

        // Generate a unique token for this invitation
        const token = crypto.randomBytes(32).toString('hex');

        const invitation = await Invitation.create({
            document: id,
            sender: req.user.userId,
            name,
            email: email.toLowerCase(),
            role,
            token
        });
        console.log(`[DEBUG] inviteGuest: Created invitation ${invitation._id} for email ${email}`);

        // Generate invitation link
        const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/sign/${token}`;

        // Send email
        const emailSent = await sendInvitationEmail({
            senderName: doc.owner.name,
            recipientEmail: email,
            recipientName: name,
            documentName: doc.filename,
            role,
            link
        });

        await logAction(doc._id, 'SHARE', req, `Invited ${name} (${email}) as ${role}`);

        if (!emailSent) {
            console.error(`[INVITE] Invitation recorded but email to ${email} failed.`);
            return res.status(200).json({ 
                message: 'Invitation saved, but email delivery failed', 
                status: 'partial_success',
                emailSent: false,
                invitation: {
                    id: invitation._id,
                    email: invitation.email,
                    role: invitation.role,
                    link
                }
            });
        }

        res.status(201).json({ 
            message: 'Invitation sent successfully', 
            status: 'success',
            emailSent: true,
            invitation: {
                id: invitation._id,
                email: invitation.email,
                role: invitation.role,
                link
            }
        });
    } catch (error) {
        console.error('Invite Guest Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteInvitation = async (req, res) => {
    try {
        const { id } = req.params;
        const invitation = await Invitation.findById(id);
        
        if (!invitation) {
            return res.status(404).json({ message: 'Invitation not found' });
        }

        const doc = await Document.findById(invitation.document);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (doc.status === 'Signed') {
            return res.status(400).json({ message: 'Cannot revoke invitation for a signed document' });
        }

        if (doc.owner.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Invitation.findByIdAndDelete(id);
        
        // Comprehensive status recovery check
        const rejectionsLeft = await Invitation.countDocuments({ document: doc._id, status: 'Rejected' });
        const totalInvitations = await Invitation.countDocuments({ document: doc._id });

        if (doc.status === 'Rejected' && rejectionsLeft === 0) {
            await Document.findByIdAndUpdate(doc._id, { $set: { status: 'Pending' } });
            console.log(`[RECOVERY] Doc ${doc._id} reset to Pending (last rejection removed)`);
        } else if (totalInvitations === 0 && doc.status !== 'Signed' && doc.status !== 'Pending') {
            await Document.findByIdAndUpdate(doc._id, { $set: { status: 'Pending' } });
            console.log(`[RECOVERY] Doc ${doc._id} reset to Pending (no invitations remaining)`);
        }

        await logAction(doc._id, 'REVOKE', req, `Revoked invitation for ${invitation.name} (${invitation.email})`);

        res.json({ message: 'Invitation revoked successfully' });
    } catch (error) {
        console.error('Delete Invitation Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.rejectDocument = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) return res.status(404).json({ message: 'Document not found' });

        const { token, signerEmail } = req.query;

        if (doc.owner.toString() !== req.user.userId && !token) {
             return res.status(403).json({ message: 'Not authorized' });
        }

        if (doc.status !== 'Pending') {
            return res.status(400).json({ message: `Cannot reject a ${doc.status} document` });
        }

        doc.status = 'Rejected';
        await doc.save();

        // If this was a guest rejection (token provided), update the invitation status
        if (token) {
            await Invitation.findOneAndUpdate(
                { document: doc._id, token: token },
                { status: 'Rejected' }
            );
        }

        await logAction(doc._id, 'REJECT', req, 'Document rejected', signerEmail);
        res.json(doc);
    } catch (error) {
        console.error('Reject Document Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
