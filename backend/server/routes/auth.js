const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

router.post('/register', async (req, res) => {
    const userDb = req.app.get('userDb');
    const { phone, password } = req.body;
    if (!phone || !password) {
        return res.status(400).json({ success: false, message: 'Phone number and password are required.' });
    }
    if (!/^\d{11}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid 11-digit phone number.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    try {
        const existingUser = await userDb.get('SELECT id FROM users WHERE phone = ?', [phone]);
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'This phone number is already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let displayId;
        let isUnique = false;
        while (!isUnique) {
            displayId = Math.random().toString().slice(2, 5).padStart(3, '0');
            const existingDisplayId = await userDb.get('SELECT id FROM users WHERE display_id = ?', [displayId]);
            if (!existingDisplayId) {
                isUnique = true;
            }
        }

        await userDb.run('INSERT INTO users (phone, password, display_id) VALUES (?, ?, ?)', [phone, hashedPassword, displayId]);
        res.status(201).json({ success: true, message: 'User registered successfully.' });
    } catch (error) {
        console.error('Registration failed:', error);
        res.status(500).json({ success: false, message: 'Registration failed: ' + error.message });
    }
});

router.post('/login', async (req, res) => {
    const userDb = req.app.get('userDb');
    const { phone, password } = req.body;
    if (!phone || !password) {
        return res.status(400).json({ success: false, message: 'Phone and password are required.' });
    }

    try {
        const user = await userDb.get('SELECT * FROM users WHERE phone = ?', [phone]);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const tokenPayload = {
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
            data: { id: user.id, display_id: user.display_id, phone: user.phone }
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'a_secure_secret_for_development');
        res.json({ success: true, token });
    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

router.post('/forgot-password', async (req, res) => {
    const userDb = req.app.get('userDb');
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    try {
        const user = await userDb.get('SELECT id FROM users WHERE phone = ?', [phone]);
        if (user) {
            const token = crypto.randomBytes(20).toString('hex');
            const expires = Date.now() + 3600000; // 1 hour
            await userDb.run('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?', [token, expires, user.id]);
            // In a real app, you'd email this token. Here we return it for testing.
            return res.json({ success: true, message: 'Password reset token generated.', reset_token: token });
        }
        // Always return a success-like message to prevent user enumeration
        res.json({ success: true, message: 'If a user with that phone number exists, a reset token has been generated.' });
    } catch (error) {
        console.error('Forgot password failed:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.post('/reset-password', async (req, res) => {
    const userDb = req.app.get('userDb');
    const { phone, token, newPassword } = req.body;
    if (!phone || !token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Phone, token, and new password are required.' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    try {
        const user = await userDb.get('SELECT * FROM users WHERE phone = ? AND reset_token = ? AND reset_expires > ?', [phone, token, Date.now()]);
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await userDb.run('UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?', [hashedPassword, user.id]);

        res.json({ success: true, message: 'Password has been reset successfully.' });
    } catch (error) {
        console.error('Reset password failed:', error);
        res.status(500).json({ success: false, message: 'Server error during password reset.' });
    }
});

module.exports = router;