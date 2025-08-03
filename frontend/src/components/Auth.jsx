// frontend/src/components/Auth.jsx
import React, { useState } from 'react';
import './Auth.css';

const Auth = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(''); // 新增密码状态
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 前端密码长度校验
    if (mode === 'register' && password.length < 6) {
      setError('密码长度不能少于6位');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    const url = mode === 'login' ? '/api/login.php' : '/api/register.php';
    const payload = { phone, password }; // 发送手机号和密码

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data.success) {
        if (mode === 'register') {
          setMessage(`注册成功！您的ID是 ${data.userId}。请用手机号和密码登录。`);
          setMode('login'); // 自动切换到登录模式
          setPassword(''); // 清空密码
        } else {
          onLoginSuccess(data.userId, data.user);
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('无法连接到服务器。请检查网络或服务器状态。');
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
          {/* 新增的密码输入框 */}
          <div className="input-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? '请设置至少6位密码' : '请输入密码'}
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
            <p>还没有账户？ <span onClick={() => { setMode('register'); setError(''); setMessage(''); }}>立即注册</span></p>
          ) : (
            <p>已有账户？ <span onClick={() => { setMode('login'); setError(''); setMessage(''); }}>直接登录</span></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
