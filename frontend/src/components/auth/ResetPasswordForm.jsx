import React, { useState } from 'react';

const ResetPasswordForm = ({ setView, phone }) => {
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const passwordValidator = (password) => {
        const errors = [];
        if (password.length < 8) errors.push('至少8个字符');
        if (!/[a-z]/.test(password)) errors.push('至少1个小写字母');
        if (!/[A-Z]/.test(password)) errors.push('至少1个大写字母');
        if (!/\d/.test(password)) errors.push('至少1个数字');
        if (!/[@$!%*?&]/.test(password)) errors.push('至少1个特殊字符 (@$!%*?&)');
        return errors;
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        
        const passwordErrors = passwordValidator(newPassword);
        if (passwordErrors.length > 0) {
            setError(`密码要求：${passwordErrors.join('，')}。`);
            return;
        }

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
                throw new Error(data.message || '发生错误。');
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
                <ul className="password-requirements">
                    <li>- 至少8个字符</li>
                    <li>- 至少1个大写字母</li>
                    <li>- 至少1个小写字母</li>
                    <li>- 至少1个数字</li>
                    <li>- 至少1个特殊字符 (@$!%*?&)</li>
                </ul>
            </div>
            <button type="submit" disabled={loading}>{loading ? '重置中...' : '重置密码'}</button>
            <div className="toggle-auth">
                <button type="button" onClick={() => setView('login')}>返回登录</button>
            </div>
        </form>
    );
};

export default ResetPasswordForm;