// frontend_react/src/components/AuthModal.js
import React, { useState } from 'react';
import { authService } from '../services/authService'; // Assuming authService.js is in src/services/
import './AuthModal.css';

const AuthModal = ({ initialView = 'login', onClose, onLoginSuccess }) => {
  const [view, setView] = useState(initialView); // 'login' or 'register'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // For registration
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitchView = (newView) => {
    setView(newView);
    setError('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (view === 'register') {
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        setIsLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('密码长度至少为6位');
        setIsLoading(false);
        return;
      }
      // Simple phone validation (e.g., 11 digits)
      if (!/^\d{11}$/.test(phone)) {
          setError('请输入有效的11位手机号码');
          setIsLoading(false);
          return;
      }
      try {
        const { user, token } = await authService.register({ phone, password });
        onLoginSuccess(user, token); // Pass user and token up
        onClose(); // Close modal on success
      } catch (err) {
        setError(err.message || '注册失败，请稍后再试');
      }
    } else { // Login view
      if (!/^\d{11}$/.test(phone)) {
          setError('请输入有效的11位手机号码');
          setIsLoading(false);
          return;
      }
      try {
        const { user, token } = await authService.login({ phone, password });
        onLoginSuccess(user, token); // Pass user and token up
        onClose(); // Close modal on success
      } catch (err) {
        setError(err.message || '登录失败，请检查手机号和密码');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-content">
        <button className="auth-modal-close-btn" onClick={onClose} aria-label="关闭">×</button>
        <h2>{view === 'login' ? '登录' : '注册'}</h2>
        
        {error && <p className="auth-error-message">{error}</p>}
        
        <form onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label htmlFor="phone">手机号:</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入11位手机号"
              required
              pattern="\d{11}"
              title="请输入11位数字手机号码"
            />
          </div>
          <div className="auth-form-group">
            <label htmlFor="password">密码:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码 (至少6位)"
              required
              minLength="6"
            />
          </div>
          {view === 'register' && (
            <div className="auth-form-group">
              <label htmlFor="confirmPassword">确认密码:</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                required
                minLength="6"
              />
            </div>
          )}
          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? '处理中...' : (view === 'login' ? '登录' : '注册')}
          </button>
        </form>
        
        <div className="auth-switch-view">
          {view === 'login' ? (
            <p>还没有账户? <button type="button" onClick={() => handleSwitchView('register')}>立即注册</button></p>
          ) : (
            <p>已有账户? <button type="button" onClick={() => handleSwitchView('login')}>立即登录</button></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
