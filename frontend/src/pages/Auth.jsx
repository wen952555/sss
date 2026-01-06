import React, { useState } from 'react';
import axios from 'axios';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ phone: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const action = isLogin ? 'login' : 'register';
    try {
      const res = await axios.post(`/api/auth.php?action=${action}`,
        new URLSearchParams(form));
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.href = '/lobby';
    } catch (err) {
      alert(err.response?.data?.msg || '操作失败');
    }
  };

  return (
    <div className="auth-container">
      <h2>{isLogin ? '登录游戏' : '用户注册'}</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="手机号" onChange={e => setForm({...form, phone: e.target.value})} />
        <input type="password" placeholder="密码" onChange={e => setForm({...form, password: e.target.value})} />
        <button type="submit">{isLogin ? '登录' : '立即注册'}</button>
      </form>
      <p onClick={() => setIsLogin(!isLogin)}>{isLogin ? '没有账号？去注册' : '已有账号？去登录'}</p>
    </div>
  );
};

export default Auth;