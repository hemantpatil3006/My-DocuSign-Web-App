const Signature = require('../models/Signature');
const Document = require('../models/Document');
const User = require('../models/User');
const Invitation = require('../models/Invitation');
const { PDFDocument } = require('pdf-lib');
const { logAction } = require('./auditController');
const { signatureSchema, updateSignatureSchema } = require('../schemas/signatureSchema');
const cloudinary = require('../utils/cloudinary');
const https = require('https');
const http = require('http');

exports.addSignature = async (req, res) => {
    try {
        const validatedData = signatureSchema.safeParse(req.body);
        if (!validatedData.success) {
            console.error('--- SIGNATURE VALIDATION FAILED ---');
            return res.status(400).json({ 
                message: 'Invalid signature data', 
                errors: validatedData.error.errors 
            });
        }

        const { documentId, page, x, y, width, height, signatureData, signerEmail } = validatedData.data;
        const { token } = req.query;

        const doc = await Document.findById(documentId);
        if (!doc) return res.status(404).json({ message: 'Document not found' });

        if (doc.status !== 'Pending') {
            return res.status(400).json({ message: `Cannot add signature to a ${doc.status} document` });
        }

        let normalizedEmail = (signerEmail || '').toLowerCase().trim();
        let userId = req.user ? req.user.userId : null;

        if (userId && !normalizedEmail) {
            const user = await User.findById(userId);
            if (user) normalizedEmail = user.email.toLowerCase().trim();
        }

        let guestName = req.body.signerName;
        if (!userId) {
            const invitation = await Invitation.findOne({ token });
            if (invitation) {
                if (!['Signer', 'Witness', 'Approver'].includes(invitation.role)) {
                    return res.status(403).json({ message: `Your role (${invitation.role}) does not allow adding signatures` });
                }
                normalizedEmail = invitation.email;
                if (!guestName) guestName = invitation.name;
            } else if (!token || doc.shareToken !== token) {
                return res.status(403).json({ message: 'Not authorized or invalid token' });
            }

            if (!normalizedEmail) {
                return res.status(400).json({ message: 'Email required for guest signing' });
            }
        }

        console.log('--- CREATING NEW SIGNATURE RECORD ---');
        const signature = await Signature.create({
            document: documentId,
            page: Number(page),
            x: Number(x),
            y: Number(y),
            width: Number(width),
            height: Number(height),
            signatureData: signatureData || null,
            signedAt: signatureData ? new Date() : null,
            signerEmail: normalizedEmail || undefined,
            signerName: guestName || (req.user ? req.user.name : 'Unknown'),
            user: userId || undefined
        });

        console.log('--- SIGNATURE RESULT ID:', signature._id);

        await logAction(documentId, 'SIGN', req, `Placed signature on page ${page} (${normalizedEmail || userId})`, normalizedEmail);
        res.status(201).json(signature);
    } catch (error) {
        console.error('Add Signature Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getSignatures = async (req, res) => {
    try {
        const { docId } = req.params;
        const { token } = req.query;

        const doc = await Document.findById(docId);
        if (!doc) return res.status(404).json({ message: 'Document not found' });

        const isOwner = req.user && doc.owner.toString() === req.user.userId;
        let isAuthorizedGuest = token && doc.shareToken === token;
        
        if (!isAuthorizedGuest && token) {
            const invitation = await Invitation.findOne({ token, document: docId });
            if (invitation) isAuthorizedGuest = true;
        }

        if (!isOwner && !isAuthorizedGuest) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const signatures = await Signature.find({ document: docId });
        res.json(signatures);
    } catch (error) {
        console.error('Get Signatures Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateSignature = async (req, res) => {
    try {
        const { id } = req.params;
        const { token } = req.query;

        const validatedData = updateSignatureSchema.safeParse(req.body);
        if (!validatedData.success) {
            return res.status(400).json({ 
                message: 'Invalid update data', 
                errors: validatedData.error.errors 
            });
        }

        const { x, y, width, height, signatureData, page } = validatedData.data;
        
        const cleanId = id.split('base64')[0].substring(0, 24);
        const signature = await Signature.findById(cleanId).populate('document');
        
        if (!signature) {
            return res.status(404).json({ message: 'Signature not found' });
        }
        
        const isOwner = req.user && signature.user?.toString() === req.user.userId;
        let isAuthorizedGuest = token && signature.document.shareToken === token;
        
        if (!isAuthorizedGuest && token) {
            const invitation = await Invitation.findOne({ token, document: signature.document._id });
            if (invitation) {
                if (!['Signer', 'Witness', 'Approver'].includes(invitation.role)) {
                    return res.status(403).json({ message: 'Action not allowed for your role' });
                }
                isAuthorizedGuest = true;
            }
        }

        if (!isOwner && !isAuthorizedGuest) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (signature.document.status !== 'Pending') {
            return res.status(400).json({ message: `Cannot update signature on a ${signature.document.status} document` });
        }

        if (x !== undefined) signature.x = Number(x);
        if (y !== undefined) signature.y = Number(y);
        if (width !== undefined) signature.width = Number(width);
        if (height !== undefined) signature.height = Number(height);
        if (page !== undefined) signature.page = Number(page);
        
        if (signatureData !== undefined) {
            signature.signatureData = signatureData;
        }
        
        await signature.save();
        res.json(signature);
    } catch (error) {
        console.error('Update Signature Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteSignature = async (req, res) => {
    try {
        const { id } = req.params;
        const { token } = req.query;

        const signature = await Signature.findById(id).populate('document');
        if (!signature) return res.status(404).json({ message: 'Signature not found' });

        const isOwner = req.user && signature.user?.toString() === req.user.userId;
        let isAuthorizedGuest = token && signature.document.shareToken === token;

        if (!isAuthorizedGuest && token) {
            const invitation = await Invitation.findOne({ token, document: signature.document._id });
            if (invitation) {
                if (!['Signer', 'Witness', 'Approver'].includes(invitation.role)) {
                    return res.status(403).json({ message: 'Action not allowed for your role' });
                }
                isAuthorizedGuest = true;
            }
        }

        if (!isOwner && !isAuthorizedGuest) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (signature.document.status !== 'Pending') {
            return res.status(400).json({ message: `Cannot delete signature on a ${signature.document.status} document` });
        }

        await signature.deleteOne();
        res.json({ message: 'Signature removed' });
    } catch (error) {
        console.error('Delete Signature Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.finalizeDocument = async (req, res) => {
    try {
        const { documentId } = req.body;
        const doc = await Document.findById(documentId);
        
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (doc.status !== 'Pending') {
            return res.status(400).json({ message: `Document is already ${doc.status}` });
        }

        // Authorization check for guest finalizing
        const { token: queryToken } = req.query;
        const { token: bodyToken } = req.body;
        const token = queryToken || bodyToken;
        const isOwner = req.user && doc.owner.toString() === req.user.userId;

        console.log(`[DEBUG] finalizeDocument: Doc ${documentId}, isOwner: ${isOwner}, token: ${!!token}`);

        // If a token is provided, we treat it as a guest action (even if the user is also the owner)
        if (token) {
            const invitation = await Invitation.findOne({ token, document: documentId });
            if (!invitation) {
                console.log(`[DEBUG] finalizeDocument: Invitation not found for token ${token}`);
                return res.status(403).json({ message: 'Invalid or expired invitation token' });
            }

            if (!['Signer', 'Approver', 'Witness'].includes(invitation.role)) {
                return res.status(403).json({ message: 'Your role does not allow finalizing this document' });
            }
            
            // Mark individual invitation as completed
            invitation.status = 'Completed';
            await invitation.save();
            console.log(`[DEBUG] finalizeDocument: Masked invitation ${invitation._id} as Completed`);
        } else if (isOwner) {
            // Document-wide finalization by owner: only allowed if no active guests remain
            const activeInvitations = await Invitation.find({
                document: documentId,
                status: 'Pending',
                expiresAt: { $gt: new Date() }
            });

            if (activeInvitations.length > 0) {
                console.log(`[DEBUG] finalizeDocument: Owner blocked by ${activeInvitations.length} active invitations`);
                return res.status(400).json({ 
                    message: 'Cannot finalize document while guest invitations are active. Please wait for guests to sign or wait for the invitation to expire.' 
                });
            }

            // Mark all pending invitations for this document as completed
            const updateResult = await Invitation.updateMany(
                { document: documentId, status: 'Pending' },
                { $set: { status: 'Completed' } }
            );
            console.log(`[DEBUG] finalizeDocument: Owner auto-completed ${updateResult.modifiedCount} invitations`);
        } else {
            // No token and not the owner
            console.log('[DEBUG] finalizeDocument: No token and not owner');
            return res.status(403).json({ message: 'Authorization required' });
        }

        const signatures = await Signature.find({ document: documentId });
        
        console.log('\n\n========== FINALIZE DOCUMENT ==========');
        console.log('Document ID:', documentId);
        console.log('Found signatures:', signatures.length);
        
        signatures.forEach((sig, index) => {
            console.log(`Signature ${index + 1}:`, {
                id: sig._id,
                page: sig.page,
                hasData: !!sig.signatureData,
                dataLength: sig.signatureData ? sig.signatureData.length : 0,
                dataPrefix: sig.signatureData ? sig.signatureData.substring(0, 30) : 'NULL'
            });
        });
        
        if (signatures.length === 0) {
            return res.status(400).json({ message: 'No signatures to finalize' });
        }

        const pdfBuffer = await new Promise((resolve, reject) => {
            const protocol = doc.originalUrl.startsWith('https') ? https : http;
            protocol.get(doc.originalUrl, (response) => {
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => resolve(Buffer.concat(chunks)));
                response.on('error', reject);
            }).on('error', reject);
        });
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();

        const filteredSignatures = signatures.filter(sig => 
            sig.signatureData && sig.signatureData.length >= 100
        );
        console.log(`--- PROCESSING ${filteredSignatures.length} signatures for embedding`);

        let embeddedCount = 0;
        
        for (const sig of filteredSignatures) {
            console.log(`\n--- Embedding Signature: ${sig._id} ---`);
            
            if (sig.signatureData && sig.signatureData.startsWith('data:image/png;base64,')) {
                try {
                    const pngImageBytes = Buffer.from(sig.signatureData.split(',')[1], 'base64');
                    const pngImage = await pdfDoc.embedPng(pngImageBytes);
                    
                    const page = pages[sig.page - 1]; 
                    if (page) {
                        const { width: pageWidth, height: pageHeight } = page.getSize();
                        const rotation = page.getRotation().angle;
                        
                        const scale = pageWidth / 800;

                        const safeX = Math.max(0, Math.min(sig.x, 800));

                        const ratio = pageHeight / pageWidth;
                        const frontendMaxY = 800 * ratio;
                        const safeY = Math.max(0, Math.min(sig.y, frontendMaxY));

                        const scaledWidth = sig.width * scale;
                        const scaledHeight = sig.height * scale;
                        const scaledX = safeX * scale;
                        

                        const scaledY = pageHeight - (safeY * scale) - scaledHeight;

                        console.log('      Page Params:', { width: pageWidth, height: pageHeight, rotation });
                        console.log('      Raw Sig Y:', sig.y, 'Max allowed Y:', frontendMaxY);
                        console.log('      Final Coords:', { x: scaledX, y: scaledY, w: scaledWidth, h: scaledHeight });

                        page.drawImage(pngImage, {
                            x: scaledX,
                            y: scaledY,
                            width: scaledWidth,
                            height: scaledHeight,

                        });
                        
                        embeddedCount++;
                        console.log('      ✓ Embedded');
                    }
                } catch (imgError) {
                    console.error('      ✗ Error:', imgError.message);
                }
            } else {
                console.warn('      ⚠ Skipping - invalid data');
            }
        }
        
        console.log(`\n✓ Embedded ${embeddedCount} out of ${signatures.length} signatures`);
        console.log('Saving PDF...');

        const pdfBytesSaved = await pdfDoc.save();
        console.log('✓ PDF saved in memory, size:', pdfBytesSaved.length, 'bytes');

        // Upload signed PDF to Cloudinary
        const signedCloudinaryUrl = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { resource_type: 'auto', folder: 'docusign-signed' },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result.secure_url);
                }
            );
            const { Readable } = require('stream');
            const readable = new Readable();
            readable.push(Buffer.from(pdfBytesSaved));
            readable.push(null);
            readable.pipe(stream);
        });
        console.log('✓ Signed PDF uploaded to Cloudinary:', signedCloudinaryUrl);

        doc.status = 'Signed';
        doc.signedUrl = signedCloudinaryUrl;
        await doc.save();
        
        console.log('✓ Document status updated to Signed');
        console.log('=======================================\n');
        
        const { signerEmail } = req.body;
        await logAction(documentId, 'FINALIZE', req, 'Document finalized with signatures', signerEmail);

        res.json({ message: 'Document finalized', document: doc });

    } catch (error) {
        console.error('\n========== FINALIZE ERROR ==========');
        console.error('Error message:', error.message);
        console.error('Stack trace:', error.stack);
        console.error('====================================\n');
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteAllSignatures = async (req, res) => {
    try {
        const { docId } = req.params;
        const doc = await Document.findById(docId);
        if (doc && doc.status !== 'Pending') {
            return res.status(400).json({ message: `Cannot clear signatures on a ${doc.status} document` });
        }
        await Signature.deleteMany({ document: docId, user: req.user.userId });
        await logAction(docId, 'UPDATE', req, 'Cleared all signatures');
        res.status(200).json({ message: 'All signatures cleared' });
    } catch (error) {
        console.error('Delete All Signatures Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
