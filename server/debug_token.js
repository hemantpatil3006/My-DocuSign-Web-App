require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGO_URI;

async function debug() {
    await mongoose.connect(uri);
    const token = '0bfbb7b598cd318e3fa2a8e628356145757169b79eb896d011973824e6583642';
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
        const results = await mongoose.connection.db.collection(col.name).find({
            $or: [
                { token: token },
                { shareToken: token },
                { _id: token.length === 24 ? new mongoose.Types.ObjectId(token) : null }
            ].filter(q => q._id !== null || !q._id)
        }).toArray();

        if (results.length > 0) {
            console.log(`FOUND IN ${col.name}:`, JSON.stringify(results, null, 2));
        }
    }

    console.log('Search completed.');
    process.exit(0);
}

debug();
