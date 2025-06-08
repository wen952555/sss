// frontend/src/pages/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // register 方法在AuthContext中

const RegisterPage = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth(); // 从AuthContext获取
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致。');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await register(phone, password);
      if (response.status === 'success') {
        setSuccess('注册成功！正在跳转到登录页面...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        // response.message 应该由 api.js 的 handleError 抛出为 err.message
        setError(response.message || '注册失败，请重试。');
      }
    } catch (err) {
      setError(err.message || '注册时发生错误。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>用户注册</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div>
          <label htmlFor="phone">手机号:</label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="请输入手机号 (无需验证)"
          />
        </div>
        <div>
          <label htmlFor="password">密码:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="6"
            placeholder="至少6位密码"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword">确认密码:</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="再次输入密码"
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}
        <button type="submit" disabled={loading}>
          {loading ? '注册中...' : '注册'}
        </button>
      </form>
      <p>已有账户? <Link to="/login">立即登录</Link></p>
    </div>
  );
};

export default RegisterPage;
