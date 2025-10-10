import React, { useState } from 'react';
import './AuthModal.css';

const AuthModal = ({ show, onClose, setToken }) => {
    // 'login', 'register', 'forgot', 'reset'
    const [view, setView] = useState('login');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleClose = () => {
        // Reset all fields when closing the modal
        setPhone('');
        setPassword('');
        setNewPassword('');
        setResetToken('');
        setError('');
        setMessage('');
        setView('login');
        onClose();
    };

    const handleLoginRegister = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        const endpoint = view === 'login' ? '/api/login.php' : '/api/register.php';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'An error occurred.');

            if (view === 'login') {
                setToken(data.token);
                setMessage('登录成功！');
                setTimeout(handleClose, 1000);
            } else {
                setMessage('注册成功！请登录。');
                setView('login');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            const response = await fetch('/api/forgot-password.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'An error occurred.');

            // For testing, we get the token back. In production, this would be sent to the user.
            if (data.reset_token) {
                 setMessage('已生成重置代码 (仅供测试): ' + data.reset_token);
                 setResetToken(data.reset_token); // Pre-fill for convenience
            } else {
                 setMessage('如果该用户存在，重置邮件已发送。');
            }
            setView('reset');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            const response = await fetch('/api/reset-password.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, token: resetToken, newPassword }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'An error occurred.');

            setMessage('密码重置成功！请重新登录。');
            setView('login');
            setPassword('');
        } catch (err) {
            setError(err.message);
        }
    };

    if (!show) return null;

    const renderForm = () => {
        switch (view) {
            case 'forgot':
                return (
                    <form onSubmit={handleForgotPassword}>
                        <h2>忘记密码</h2>
                        <p>请输入您的手机号，我们将发送重置代码。</p>
                        <div className="form-group">
                            <label htmlFor="auth-phone">手机号</label>
                            <input id="auth-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                        </div>
                        <button type="submit">获取重置代码</button>
                        <div className="toggle-auth">
                            <button type="button" onClick={() => setView('login')}>返回登录</button>
                        </div>
                    </form>
                );
            case 'reset':
                 return (
                    <form onSubmit={handleResetPassword}>
                        <h2>重置密码</h2>
                        <div className="form-group">
                            <label htmlFor="reset-token">重置代码</label>
                            <input id="reset-token" type="text" value={resetToken} onChange={(e) => setResetToken(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="new-password">新密码</label>
                            <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                        </div>
                        <button type="submit">重置密码</button>
                         <div className="toggle-auth">
                            <button type="button" onClick={() => setView('login')}>返回登录</button>
                        </div>
                    </form>
                );
            default: // login and register
                return (
                    <form onSubmit={handleLoginRegister}>
                        <h2>{view === 'login' ? '登录' : '注册'}</h2>
                        <div className="form-group">
                            <label htmlFor="auth-phone">手机号</label>
                            <input id="auth-phone" type="tel" placeholder="请输入11位手机号" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="auth-password">密码</label>
                            <input id="auth-password" type="password" placeholder={view === 'register' ? "至少8个字符" : "请输入密码"} value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <button type="submit">{view === 'login' ? '登录' : '注册'}</button>
                        <div className="toggle-auth">
                            <button type="button" onClick={() => setView(view === 'login' ? 'register' : 'login')}>
                                {view === 'login' ? '还没有账户？点击注册' : '已有账户？点击登录'}
                            </button>
                             {view === 'login' && <button type="button" onClick={() => setView('forgot')}>忘记密码？</button>}
                        </div>
                    </form>
                );
        }
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={handleClose}>×</button>
                {renderForm()}
                {error && <p className="error-message">{error}</p>}
                {message && <p className="success-message">{message}</p>}
            </div>
        </div>
    );
};

export default AuthModal;