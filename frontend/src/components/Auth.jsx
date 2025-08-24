// --- START OF FILE frontend/src/components/Auth.jsx (FINAL DB VERSION) ---

import React, { useState } from 'react';
import './Auth.css';

const Auth = ({ onLoginSuccess, onClose }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError('');

    const endpoint = isLoginView ? '/api/login.php' : '/api/register.php';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 登录或注册成功，调用父组件的回调函数
        onLoginSuccess(data.userId, data.userData);
      } else {
        setError(data.message || (isLoginView ? '登录失败' : '注册失败'));
      }
    } catch (err) {
      setError('无法连接到服务器，请检查网络。');
      console.error('Auth request failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError(''); // 切换视图时清空错误信息
    setPhone('');
    setPassword('');
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose}>&times;</button>
        <h2 className="auth-title">{isLoginView ? '欢迎回来' : '加入我们'}</h2>
        <p className="auth-subtitle">{isLoginView ? '登录以继续游戏' : '创建新账户开始冒险'}</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <input
              type="tel"
              id="phone"
              placeholder="请输入11位手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              id="password"
              placeholder="请设置至少6位密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isLoginView ? "current-password" : "new-password"}
            />
          </div>
          
          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? '请稍候...' : (isLoginView ? '登 录' : '注 册')}
          </button>
        </form>

        <p className="auth-toggle">
          {isLoginView ? '还没有账户？' : '已有账户？'}
          <button onClick={toggleView} className="toggle-button">
            {isLoginView ? '立即注册' : '立即登录'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;

// --- END OF FILE frontend/src/components/Auth.jsx (FINAL DB VERSION) ---