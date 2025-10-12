const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const passwordValidator = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
};

async function generateUniqueDisplayId(userDb) {
    let displayId;
    let isUnique = false;
    while (!isUnique) {
        displayId = Math.random().toString(36).substring(2, 8);
        const existingUser = await userDb.get('SELECT id FROM users WHERE display_id = ?', [displayId]);
        if (!existingUser) {
            isUnique = true;
        }
    }
    return displayId;
}

router.post('/register', async (req, res) => {
    const userDb = req.app.get('userDb');
    const { phone, password } = req.body;
    if (!phone || !password) {
        return res.status(400).json({ success: false, message: '手机号和密码是必填项。' });
    }
    if (!/^\d{11}$/.test(phone)) {
        return res.status(400).json({ success: false, message: '请输入有效的11位手机号。' });
    }
    if (!passwordValidator(password)) {
        return res.status(400).json({ success: false, message: '密码必须至少包含8个字符，一个大写字母，一个小写字母，一个数字和一个特殊字符。' });
    }

    try {
        const existingUser = await userDb.get('SELECT id FROM users WHERE phone = ?', [phone]);
        if (existingUser) {
            return res.status(409).json({ success: false, message: '该手机号已被注册。' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const displayId = await generateUniqueDisplayId(userDb);

        const result = await userDb.run('INSERT INTO users (phone, password, display_id) VALUES (?, ?, ?)', [phone, hashedPassword, displayId]);
        
        const newUser = await userDb.get('SELECT * FROM users WHERE id = ?', [result.lastID]);

        const tokenPayload = {
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
            data: { id: newUser.id, display_id: newUser.display_id, phone: newUser.phone }
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET);
        
        res.status(201).json({ success: true, token });
    } catch (error) {
        console.error('Registration failed:', error);
        res.status(500).json({ success: false, message: '注册失败： ' + error.message });
    }
});

router.post('/login', async (req, res) => {
    const userDb = req.app.get('userDb');
    const { phone, password } = req.body;
    if (!phone || !password) {
        return res.status(400).json({ success: false, message: '手机号和密码是必填项。' });
    }

    try {
        const user = await userDb.get('SELECT * FROM users WHERE phone = ?', [phone]);
        if (!user) {
            return res.status(401).json({ success: false, message: '无效的凭证。' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: '无效的凭证。' });
        }

        const tokenPayload = {
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
            data: { id: user.id, display_id: user.display_id, phone: user.phone }
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET);
        res.json({ success: true, token });
    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({ success: false, message: '登录期间发生服务器错误。' });
    }
});

router.post('/forgot-password', async (req, res) => {
    const userDb = req.app.get('userDb');
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ success: false, message: '手机号是必填项。' });
    }

    try {
        const user = await userDb.get('SELECT id FROM users WHERE phone = ?', [phone]);
        if (user) {
            const token = crypto.randomBytes(20).toString('hex');
            const expires = Date.now() + 3600000; // 1 hour
            await userDb.run('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?', [token, expires, user.id]);
            // In a real app, you'd email this token. Here we return it for testing.
            return res.json({ success: true, message: '密码重置令牌已生成。', reset_token: token });
        }
        // Always return a success-like message to prevent user enumeration
        res.json({ success: true, message: '如果存在使用该手机号的用户，则已生成重置令牌。' });
    } catch (error) {
        console.error('Forgot password failed:', error);
        res.status(500).json({ success: false, message: '服务器错误。' });
    }
});

router.post('/reset-password', async (req, res) => {
    const userDb = req.app.get('userDb');
    const { phone, token, newPassword } = req.body;
    if (!phone || !token || !newPassword) {
        return res.status(400).json({ success: false, message: '手机号、令牌和新密码是必填项。' });
    }
    if (!passwordValidator(newPassword)) {
        return res.status(400).json({ success: false, message: '密码必须至少包含8个字符，一个大写字母，一个小写字母，一个数字和一个特殊字符。' });
    }

    try {
        const user = await userDb.get('SELECT * FROM users WHERE phone = ? AND reset_token = ? AND reset_expires > ?', [phone, token, Date.now()]);
        if (!user) {
            return res.status(400).json({ success: false, message: '无效或过期的重置令牌。' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await userDb.run('UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?', [hashedPassword, user.id]);

        res.json({ success: true, message: '密码已成功重置。' });
    } catch (error) {
        console.error('Reset password failed:', error);
        res.status(500).json({ success: false, message: '密码重置期间发生服务器错误。' });
    }
});

module.exports = router;