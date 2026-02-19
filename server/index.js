const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;


app.use((req, res, next) => {
    const origin = req.headers.origin;
    console.log(`[CORS Check] ${req.method} ${req.url} - Origin: ${origin}`);
    
    // Nuclear CORS: Allow common project origins explicitly
    if (origin && (origin.includes('netlify.app') || origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    }

    // Handle Preflight
    if (req.method === 'OPTIONS') {
        console.log(`[CORS Preflight] Handled for: ${origin}`);
        return res.status(200).end();
    }
    
    next();
});

app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


console.log('--- Setting up routes...');
app.use('/uploads', express.static('uploads'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/docs', require('./routes/documentRoutes'));
app.use('/api/signatures', require('./routes/signatureRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));
console.log('--- Routes configured.');


app.get('/', (req, res) => {
    res.send('Document Signature SaaS API is running');
});


const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

connectDB();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
