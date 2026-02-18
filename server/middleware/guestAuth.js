const jwt = require('jsonwebtoken');

const guestAuth = (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const shareToken = req.query?.token || req.body?.token;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            return next();
        } catch (error) {
            if (!shareToken) return res.status(401).json({ message: 'Invalid token' });
        }
    }

    if (shareToken) {
        req.isGuest = true;
        return next();
    }

    return res.status(401).json({ message: 'Authentication or share token required' });
};

module.exports = guestAuth;
