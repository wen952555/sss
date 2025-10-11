import React, { useState } from 'react';

const RegisterForm = ({ setView }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setError('');
        setMessage('');
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
            setMessage('注册成功！请登录。');
            setTimeout(() => setView('login'), 2000);
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
            {message && <p className="success-message">{message}</p>}
            <div className="form-group">
                <label htmlFor="auth-phone">手机号</label>
                <input id="auth-phone" type="tel" placeholder="请输入11位手机号" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div className="form-group">
                <label htmlFor="auth-password">密码</label>
                <input id="auth-password" type="password" placeholder="至少8个字符" value={password} onChange={(e) => setPassword(e.target.value)} required />
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