import React, { useState } from 'react';
import api from '../api';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ phone: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? 'auth.php?action=login' : 'auth.php?action=register';
    try {
      const res = await api.post(endpoint, new URLSearchParams(form));
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        window.location.href = '/lobby';
      }
    } catch (err) {
      alert(err.response?.data?.msg || '操作失败');
    }
  };

  return (
    <div className="auth-container">
      <h1>十三水竞技场</h1>
      <div className="form-card">
        <h2>{isLogin ? '登录' : '注册'}</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="手机号" required onChange={e => setForm({...form, phone: e.target.value})} />
          <input type="password" placeholder="密码" required onChange={e => setForm({...form, password: e.target.value})} />
          <button type="submit">{isLogin ? '进入游戏' : '立即注册'}</button>
        </form>
        <button className="switch-btn" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? '没有账号？去注册' : '已有账号？去登录'}
        </button>
      </div>
    </div>
  );
};

export default Auth;