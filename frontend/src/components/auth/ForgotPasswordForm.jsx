import React, { useState } from 'react';

const ForgotPasswordForm = ({ setView, setPhone, phone }) => {
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'An error occurred.');
            }
            setMessage(data.message);
            if (data.reset_token) {
                // In a real app, this would be sent to the user.
                // For testing, we can pre-fill the reset token.
                console.log('Reset Token:', data.reset_token);
            }
            setTimeout(() => setView('reset'), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleForgotPassword}>
            <h2>忘记密码</h2>
            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}
            <p>请输入您的手机号，我们将发送重置代码。</p>
            <div className="form-group">
                <label htmlFor="auth-phone">手机号</label>
                <input id="auth-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading}>{loading ? '发送中...' : '获取重置代码'}</button>
            <div className="toggle-auth">
                <button type="button" onClick={() => setView('login')}>返回登录</button>
            </div>
        </form>
    );
};

export default ForgotPasswordForm;