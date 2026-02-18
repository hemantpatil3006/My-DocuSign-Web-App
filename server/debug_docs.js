require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGO_URI;

async function debug() {
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const docs = await mongoose.connection.db.collection('documents').find({ 
        filename: /Rock-Paper-Scissor/ 
    }).sort({ createdAt: -1 }).toArray();

    for (const doc of docs) {
        const invs = await mongoose.connection.db.collection('invitations').find({ document: doc._id }).toArray();
        console.log(`\nDOC: ${doc._id} | Filename: ${doc.filename} | Status: ${doc.status} | Invs: ${invs.length}`);
        if (invs.length > 0) {
            console.log('  INVS:', JSON.stringify(invs.map(i => ({ token: i.token, email: i.email, status: i.status, createdAt: i.createdAt })), null, 2));
        }
    }

    process.exit(0);
}

debug().catch(err => {
    console.error(err);
    process.exit(1);
});
