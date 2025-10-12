import React, { useState } from 'react';

const LoginForm = ({ setToken, setView, handleClose }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        
        if (!/^\d{11}$/.test(phone)) {
            setError('请输入有效的11位手机号。');
            return;
        }
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || '发生错误。');
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
        <form onSubmit={handleLogin}>
            <h2>登录</h2>
            {error && <p className="error-message">{error}</p>}
            <div className="form-group">
                <label htmlFor="auth-phone">手机号</label>
                <input id="auth-phone" type="tel" placeholder="请输入11位手机号" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div className="form-group">
                <label htmlFor="auth-password">密码</label>
                <input id="auth-password" type="password" placeholder="请输入密码" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading}>{loading ? '登录中...' : '登录'}</button>
            <div className="toggle-auth">
                <button type="button" onClick={() => setView('register')}>
                    还没有账户？点击注册
                </button>
                <button type="button" onClick={() => setView('forgot')}>忘记密码？</button>
            </div>
        </form>
    );
};

export default LoginForm;
