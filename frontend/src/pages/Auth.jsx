import React, { useState } from 'react';
import api from '../api';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    // 确保这里的路径指向 api.php
    const url = `api.php?module=auth&action=${isLogin ? 'login' : 'register'}`;
    
    try {
      const res = await api.post(url, form);
      
      if (isLogin) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        alert('登录成功！');
        window.location.href = '/lobby';
      } else {
        alert('注册成功！现在请切换到登录。');
        setIsLogin(true);
      }
    } catch (err) {
      const msg = err.response?.data?.msg || '连接失败，请检查 Serv00 后端';
      alert('错误: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ padding: '20px', maxWidth: '400px', margin: '50px auto' }}>
      <h2>十三水 - {isLogin ? '登录' : '注册'}</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <input type="text" placeholder="手机号" required style={{ width: '100%', padding: '8px' }}
            onChange={e => setForm({...form, phone: e.target.value})} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input type="password" placeholder="密码" required style={{ width: '100%', padding: '8px' }}
            onChange={e => setForm({...form, password: e.target.value})} />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px' }}>
          {loading ? '处理中...' : (isLogin ? '登录' : '立即注册')}
        </button>
      </form>
      <p style={{ marginTop: '20px', cursor: 'pointer', color: 'blue' }} onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? '没有账号？去注册' : '已有账号？去登录'}
      </p>
    </div>
  );
};

export default Auth;