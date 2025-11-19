import React, { useState } from 'react';
import { registerUser } from '../utils/api';

const Register = ({ onLogin, onNavigate }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        try {
            const userData = await registerUser({ phone, password });
            onLogin(userData); // Automatically log in after registration
        } catch (err) {
            setError(err.message || '注册失败，请稍后再试');
        }
    };

    return (
        <div className="container">
            <h2>创建新账户</h2>
            <p>加入我们，开始您的游戏之旅</p>
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
                <div className="form-group">
                    <label htmlFor="confirmPassword">确认密码</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="请再次输入您的密码"
                    />
                </div>

                {error && <p className="error-message">{error}</p>}

                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    注册
                </button>
            </form>
            <p style={{ marginTop: '2rem', fontSize: '0.9rem' }}>
                已有账户？{' '}
                <a onClick={() => onNavigate('login')}>
                    返回登录
                </a>
            </p>
        </div>
    );
};

export default Register;
