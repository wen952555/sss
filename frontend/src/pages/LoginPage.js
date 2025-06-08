// frontend/src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log('LoginPage: Attempting login with phone:', phone);
    try {
      const response = await login(phone, password); // login 现在在AuthContext中处理setUser
      console.log('LoginPage: Login response received in page:', response);
      // AuthContext 的 login 方法会处理 setUser。如果成功，user状态会更新。
      // useAuth() hook 会使依赖它的组件（如AppHeader, ProtectedRoute）重新渲染。
      navigate('/game'); 
    } catch (err) {
      console.error('LoginPage: Login attempt failed:', err.message, err);
      setError(err.message || '登录失败，请检查您的手机号和密码。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>用户登录</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div>
          <label htmlFor="login-phone">手机号:</label>
          <input
            type="tel"
            id="login-phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="请输入手机号"
            autoComplete="username tel"
          />
        </div>
        <div>
          <label htmlFor="login-password">密码:</label>
          <input
            type="password"
            id="login-password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="请输入密码"
            autoComplete="current-password"
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
      <p>还没有账户? <Link to="/register">立即注册</Link></p>
    </div>
  );
};

export default LoginPage;
