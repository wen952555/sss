// frontend/src/components/Auth.jsx
import React, { useState } from 'react';
import './Auth.css';

const Auth = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    const url = mode === 'login' ? '/api/login.php' : '/api/register.php';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();

      if (data.success) {
        if (mode === 'register') {
          setMessage(`注册成功！您的ID是 ${data.userId}。请用手机号登录。`);
          setMode('login'); // 自动切换到登录模式
        } else {
          onLoginSuccess(data.userId, data.user);
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('无法连接到服务器。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>{mode === 'login' ? '欢迎回来' : '加入我们'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="phone">手机号</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入11位手机号"
              required
            />
          </div>
          <button type="submit" disabled={isLoading} className="submit-button">
            {isLoading ? '请稍候...' : (mode === 'login' ? '登录' : '注册')}
          </button>
        </form>
        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}
        <div className="toggle-mode">
          {mode === 'login' ? (
            <p>还没有账户？ <span onClick={() => setMode('register')}>立即注册</span></p>
          ) : (
            <p>已有账户？ <span onClick={() => setMode('login')}>直接登录</span></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
