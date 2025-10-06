// frontend/src/components/AuthModal.jsx
import React, { useState } from 'react';
import './AuthModal.css';

const AuthModal = ({ show, onClose, setToken }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState(''); // Changed from username to phone
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!show) {
    return null;
  }

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }), // Changed from username to phone
      });
      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          setToken(data.token);
          onClose(); // Close modal on successful login
        } else {
          setMessage('注册成功！请切换到登录页面。');
          setIsLogin(true); // Switch to login view after successful registration
        }
      } else {
        setError(data.message || '操作失败');
      }
    } catch (err) {
      setError('发生网络错误');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button" onClick={onClose}>&times;</button>
        <div className="modal-tabs">
          <button onClick={() => setIsLogin(true)} className={isLogin ? 'active' : ''}>登录</button>
          <button onClick={() => setIsLogin(false)} className={!isLogin ? 'active' : ''}>注册</button>
        </div>
        <h2>{isLogin ? '登录' : '注册'}</h2>
        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label htmlFor="auth-phone">手机号</label>
            <input
              id="auth-phone"
              type="tel" // Use 'tel' for phone numbers
              placeholder="请输入11位手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
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