import React, { useState } from 'react';

const RegisterForm = ({ setToken, setView, handleClose }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const passwordValidator = (password) => {
        const errors = [];
        if (password.length < 6) errors.push('至少6个字符');
        return errors;
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        if (!/^\d{11}$/.test(phone)) {
            setError('请输入有效的11位手机号。');
            return;
        }

        const passwordErrors = passwordValidator(password);
        if (passwordErrors.length > 0) {
            setError(`密码要求：${passwordErrors.join('，')}。`);
            return;
        }

        if (password !== confirmPassword) {
            setError('密码不匹配。');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'An error occurred.');
            }
            setToken(data.token);
            setTimeout(handleClose, 1000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleRegister}>
            <h2>注册</h2>
            {error && <p className="error-message">{error}</p>}
            <div className="form-group">
                <label htmlFor="auth-phone">手机号</label>
                <input id="auth-phone" type="tel" placeholder="请输入11位手机号" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div className="form-group">
                <label htmlFor="auth-password">密码</label>
                <input id="auth-password" type="password" placeholder="设置您的密码" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <ul className="password-requirements">
                    <li>- 至少6个字符</li>
                </ul>
            </div>
            <div className="form-group">
                <label htmlFor="auth-confirm-password">确认密码</label>
                <input id="auth-confirm-password" type="password" placeholder="请再次输入密码" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading}>{loading ? '注册中...' : '注册'}</button>
            <div className="toggle-auth">
                <button type="button" onClick={() => setView('login')}>
                    已有账户？点击登录
                </button>
            </div>
        </form>
    );
};

export default RegisterForm;