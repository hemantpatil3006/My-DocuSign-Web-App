const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Ensure the uploads directory exists (required on Render where filesystem is ephemeral)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
}

const app = express();
const PORT = process.env.PORT || 5000;


// Request logging for debugging
app.use((req, res, next) => {
    console.log(`--- [Incoming Request] ${req.method} ${req.url} ---`);
    console.log('Origin:', req.headers.origin);
    next();
});

// Priority CORS configuration
app.use(cors({
    origin: true, // Reflects the request origin
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.options(/\/.*/, cors());



app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        time: new Date().toISOString(),
        origin: req.headers.origin,
        headers: res.getHeaders()
    });
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
