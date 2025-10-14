import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { login, register } from '../../utils/api';

const AuthForm = ({ setToken, setView, handleClose, isRegister = false }) => {
    const [formData, setFormData] = useState({ phone: '', password: '', confirmPassword: '' });
    const authFn = isRegister ? register : login;
    const { loading, error, handleSubmit } = useAuth(authFn, setToken, handleClose);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <form onSubmit={(e) => handleSubmit(e, formData)}>
            <h2>{isRegister ? '注册' : '登录'}</h2>
            {error && <p className="error-message">{error}</p>}
            <div className="form-group">
                <label htmlFor="auth-phone">手机号</label>
                <input id="auth-phone" type="tel" name="phone" placeholder="请输入11位手机号" value={formData.phone} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label htmlFor="auth-password">密码</label>
                <input id="auth-password" type="password" name="password" placeholder="请输入密码" value={formData.password} onChange={handleChange} required />
                {isRegister && (
                    <ul className="password-requirements">
                        <li>- 至少8个字符</li>
                        <li>- 包含大小写字母</li>
                        <li>- 包含数字</li>
                        <li>- 包含特殊字符 (!@#$%^&*)</li>
                    </ul>
                )}
            </div>
            {isRegister && (
                <div className="form-group">
                    <label htmlFor="auth-confirm-password">确认密码</label>
                    <input id="auth-confirm-password" type="password" name="confirmPassword" placeholder="请再次输入密码" value={formData.confirmPassword} onChange={handleChange} required />
                </div>
            )}
            <button type="submit" disabled={loading}>{loading ? (isRegister ? '注册中...' : '登录中...') : (isRegister ? '注册' : '登录')}</button>
            <div className="toggle-auth">
                <button type="button" onClick={() => setView(isRegister ? 'login' : 'register')}>
                    {isRegister ? '已有账户？点击登录' : '还没有账户？点击注册'}
                </button>
                {!isRegister && (
                    <button type="button" onClick={() => setView('forgot')}>忘记密码？</button>
                )}
            </div>
        </form>
    );
};

export default AuthForm;