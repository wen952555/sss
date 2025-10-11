import React, { useState } from 'react';

const ResetPasswordForm = ({ setView, phone }) => {
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, token, newPassword }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'An error occurred.');
            }
            setMessage('密码重置成功！请重新登录。');
            setTimeout(() => setView('login'), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleResetPassword}>
            <h2>重置密码</h2>
            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}
            <div className="form-group">
                <label htmlFor="reset-token">重置代码</label>
                <input id="reset-token" type="text" value={token} onChange={(e) => setToken(e.target.value)} required />
            </div>
            <div className="form-group">
                <label htmlFor="new-password">新密码</label>
                <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading}>{loading ? '重置中...' : '重置密码'}</button>
            <div className="toggle-auth">
                <button type="button" onClick={() => setView('login')}>返回登录</button>
            </div>
        </form>
    );
};

export default ResetPasswordForm;