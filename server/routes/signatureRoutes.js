const express = require('express');
const router = express.Router();
const { addSignature, getSignatures, finalizeDocument, updateSignature, deleteSignature, deleteAllSignatures } = require('../controllers/signatureController');
const auth = require('../middleware/auth');
const guestAuth = require('../middleware/guestAuth');

router.post('/', guestAuth, addSignature);
router.get('/:docId', guestAuth, getSignatures);
router.put('/:id', guestAuth, updateSignature);
router.delete('/all/:docId', auth, deleteAllSignatures);
router.delete('/:id', guestAuth, deleteSignature);
router.post('/finalize', guestAuth, finalizeDocument);

module.exports = router;
