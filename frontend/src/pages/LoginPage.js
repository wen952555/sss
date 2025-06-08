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
    try {
      await login(phone, password);
      navigate('/game'); 
    } catch (err) {
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
          <label htmlFor="login-phone">手机号:</label> {/* Changed id */}
          <input
            type="tel"
            id="login-phone" // Changed id
            name="phone" // Added name attribute
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="请输入手机号"
            autoComplete="username tel" // Added autocomplete
          />
        </div>
        <div>
          <label htmlFor="login-password">密码:</label> {/* Changed id */}
          <input
            type="password"
            id="login-password" // Changed id
            name="password" // Added name attribute
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="请输入密码"
            autoComplete="current-password" // Added autocomplete
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
