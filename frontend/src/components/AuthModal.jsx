import React, { useState } from 'react';
import './AuthModal.css';

const AuthModal = ({ show, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const url = endpoint;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'An error occurred.');
            }

            if (isLogin) {
                localStorage.setItem('token', data.token);
                setMessage('登录成功！');
                setTimeout(() => {
                    onClose();
                    window.location.reload();
                }, 1000);
            } else {
                setMessage('注册成功！请登录。');
                setIsLogin(true); // Switch to login form
            }

        } catch (err) {
            setError(err.message);
        }
    };

    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>×</button>
                <h2>{isLogin ? '登录' : '注册'}</h2>
                <div className="toggle-auth">
                    <button onClick={() => setIsLogin(!isLogin)}>
                        {isLogin ? '还没有账户？点击注册' : '已有账户？点击登录'}
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="auth-phone">手机号</label>
                        <input
                            id="auth-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="auth-password">密码</label>
                        <input
                            id="auth-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    {message && <p className="success-message">{message}</p>}
                    <button type="submit">{isLogin ? '登录' : '注册'}</button>
                </form>
            </div>
        </div>
    );
};

export default AuthModal;