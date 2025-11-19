import React, { useState } from 'react';
import { loginUser } from '../utils/api';

const Login = ({ onLogin, onNavigate }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const userData = await loginUser({ phone, password });
            onLogin(userData); // Pass user data up to App.jsx
        } catch (err) {
            setError(err.message || '登录失败，请检查您的手机号和密码');
        }
    };

    return (
        <div className="container">
            <h2>欢迎回来</h2>
            <p>请输入您的账户信息以继续</p>
            <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
                <div className="form-group">
                    <label htmlFor="phone">手机号</label>
                    <input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        placeholder="请输入您的手机号"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">密码</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="请输入您的密码"
                    />
                </div>

                {error && <p className="error-message">{error}</p>}

                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    登录
                </button>
            </form>
            <p style={{ marginTop: '2rem', fontSize: '0.9rem' }}>
                还没有账户？{' '}
                <a onClick={() => onNavigate('register')}>
                    立即注册
                </a>
            </p>
        </div>
    );
};

export default Login;
