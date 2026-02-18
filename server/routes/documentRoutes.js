const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const auth = require('../middleware/auth');
const guestAuth = require('../middleware/guestAuth');
const upload = require('../middleware/upload');

router.post('/upload', auth, upload.single('file'), documentController.uploadDocument);
router.get('/', auth, documentController.getDocuments);
router.post('/share/:id', auth, documentController.generateShareLink);
router.post('/invite/:id', auth, documentController.inviteGuest);
router.delete('/invite/:id', auth, documentController.deleteInvitation);
router.get('/public/:token', guestAuth, documentController.getDocumentByToken);
router.post('/reject/:id', guestAuth, documentController.rejectDocument);
router.get('/download/:id', guestAuth, documentController.downloadDocument);
router.get('/:id', guestAuth, documentController.getDocumentById);
router.delete('/:id', auth, documentController.deleteDocument);

module.exports = router;
