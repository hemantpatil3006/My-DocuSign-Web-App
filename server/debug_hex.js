require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGO_URI;

async function debug() {
    await mongoose.connect(uri);
    const docId = '699489d427a620abd80bce7f';
    
    const inv = await mongoose.connection.db.collection('invitations').findOne({ document: new mongoose.Types.ObjectId(docId) });
    const sig = await mongoose.connection.db.collection('signatures').findOne({ document: new mongoose.Types.ObjectId(docId) });

    if (inv) {
        console.log('INV Email:', inv.email);
        console.log('INV Email Hex:', Buffer.from(inv.email).toString('hex'));
    }
    if (sig) {
        console.log('SIG Email:', sig.signerEmail);
        console.log('SIG Email Hex:', Buffer.from(sig.signerEmail).toString('hex'));
    }

    process.exit(0);
}

debug();
