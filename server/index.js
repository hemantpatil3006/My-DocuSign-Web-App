const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;


app.use(helmet({
    crossOriginResourcePolicy: false,
}));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
    next();
});

const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'http://localhost:5173';

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedPatterns = [
      /\.netlify\.app$/,
      /localhost/,
      /127\.0\.0\.1/
    ];

    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
    
    if (isAllowed || origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      console.log(`[CORS Blocked] Origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

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
