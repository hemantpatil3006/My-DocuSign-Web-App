const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendResetPasswordEmail } = require('../utils/email');

const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
    
    return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email: normalizedEmail,
            password: hashedPassword
        });

        await newUser.save();

        const { accessToken, refreshToken } = generateTokens(newUser);

        await new RefreshToken({
            token: refreshToken,
            user: newUser._id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdByIp: req.ip
        }).save();

        res.status(201).json({
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error('[AUTH] Register error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = (email || '').toLowerCase().trim();
        
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ 
                message: "We couldn't find an account with that email. Please sign up to create one." 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ 
                message: 'Invalid email or password. Please try again.' 
            });
        }

        const { accessToken, refreshToken } = generateTokens(user);

        await new RefreshToken({
            token: refreshToken,
            user: user._id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdByIp: req.ip
        }).save();

        console.log(`[AUTH] Successful login: ${normalizedEmail}`);
        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error('[AUTH] Login error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh Token required' });
        }

        const storedToken = await RefreshToken.findOne({ token: refreshToken });
        if (!storedToken) {
            return res.status(403).json({ message: 'Invalid Refresh Token' });
        }

        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: 'Invalid Refresh Token' });
            }

            const user = await User.findById(decoded.userId);
            if (!user) {
                return res.status(403).json({ message: 'User not found' });
            }

            const tokens = generateTokens(user);

            await RefreshToken.findByIdAndDelete(storedToken._id);
            
            await new RefreshToken({
                token: tokens.refreshToken,
                user: user._id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                createdByIp: req.ip
            }).save();

            res.json({
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken
            });
        });

    } catch (error) {
        console.error('[AUTH] Token refresh error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(404).json({ message: 'User with this email does not exist' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

        // Send reset email via SendGrid utility
        const emailSent = await sendResetPasswordEmail(user.email, resetUrl);
        
        if (emailSent) {
            res.json({ message: 'Password reset link sent to your email' });
        } else {
            res.status(500).json({ message: 'Failed to send reset email' });
        }

    } catch (error) {
        console.error('[AUTH] Forgot password error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.json({ message: 'Password has been reset successfully' });

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
