import React, { useState } from 'react';
import apiService from '../api/apiService';

const Auth = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const response = await apiService.login(phone, password);
        if (response.success) {
          onLoginSuccess(response.token);
        } else {
          setError(response.message || '登录失败');
        }
      } else {
        const response = await apiService.register(phone, password);
        if (response.success) {
          alert('注册成功！请登录。');
          setIsLogin(true);
        } else {
          setError(response.message || '注册失败');
        }
      }
    } catch (err) {
      setError('发生网络错误，请稍后再试。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h2>{isLogin ? '登录' : '注册'}</h2>
      <form onSubmit={handleSubmit} className="form-container">
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
        <button type="submit" disabled={isLoading}>
          {isLoading ? '处理中...' : (isLogin ? '登录' : '注册')}
        </button>
        {error && <p className="error-message">{error}</p>}
      </form>
      <button onClick={() => { setIsLogin(!isLogin); setError(''); }}>
        {isLogin ? '没有账号？去注册' : '已有账号？去登录'}
      </button>
    </div>
  );
};

export default Auth;