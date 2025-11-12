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
    
    // 前端验证
    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }
    
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }
    
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('手机号格式不正确');
      return;
    }
    
    if (password.length < 6) {
      setError('密码长度不能少于6位');
      return;
    }

    setIsLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await apiService.login(phone, password);
        if (response.success) {
          onLoginSuccess(response.token, response.user);
        } else {
          setError(response.message || '登录失败');
        }
      } else {
        response = await apiService.register(phone, password);
        if (response.success) {
          setError('');
          alert(`注册成功！您的游戏ID是：${response.user_id_4d}，请登录。`);
          setIsLogin(true);
          setPhone('');
          setPassword('');
        } else {
          setError(response.message || '注册失败');
        }
      }
    } catch (err) {
      setError('发生网络错误，请稍后再试。');
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setPhone('');
    setPassword('');
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
          maxLength="11"
          autoComplete="tel"
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength="6"
          autoComplete={isLogin ? "current-password" : "new-password"}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? '处理中...' : (isLogin ? '登录' : '注册')}
        </button>
        {error && <p className="error-message">{error}</p>}
      </form>
      <button onClick={switchMode} disabled={isLoading}>
        {isLogin ? '没有账号？去注册' : '已有账号？去登录'}
      </button>
    </div>
  );
};

export default Auth;