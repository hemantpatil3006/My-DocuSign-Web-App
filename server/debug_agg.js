require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGO_URI;

async function debug() {
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const doc = await mongoose.connection.db.collection('documents').findOne({filename: /Rock-Paper-Scissor/});
    if (!doc) {
        console.log('Document not found');
        process.exit(1);
    }
    console.log('Document ID:', doc._id);
    console.log('Owner ID:', doc.owner);

    const docs = await mongoose.connection.db.collection('documents').aggregate([
        { $match: { owner: doc.owner } },
        {
            $lookup: {
                from: 'invitations',
                localField: '_id',
                foreignField: 'document',
                as: 'invitations'
            }
        },
        {
            $project: {
                filename: 1,
                'invitations.name': 1
            }
        }
    ]).toArray();

    console.log(`Found ${docs.length} documents`);
    docs.forEach(d => {
        console.log(`- ${d.filename}: ${d.invitations ? d.invitations.length : 0} invitations`);
    });

    process.exit(0);
}

debug().catch(err => {
    console.error(err);
    process.exit(1);
});
