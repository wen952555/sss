import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import auth from '../services/auth';

const LoginPage = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/user/login', { phone, password });
      auth.login(response.token, response.userId);
      navigate('/');
    } catch (err) {
      setError('登录失败，请检查手机号和密码');
    }
  };

  return (
    <div className="login-page">
      <h2>登录</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="手机号"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">登录</button>
      </form>
    </div>
  );
};

export default LoginPage;
