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
    // 统一通过 api.php 入口分发，避免路径混乱
    const url = `api.php?module=auth&action=${isLogin ? 'login' : 'register'}`;
    
    try {
      console.log("准备提交表单...", form);
      const res = await api.post(url, form);
      
      if (isLogin) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        alert('登录成功！');
        window.location.href = '/lobby';
      } else {
        alert('注册成功！快去登录吧');
        setIsLogin(true);
      }
    } catch (err) {
      console.error("提交出错:", err);
      const msg = err.response?.data?.msg || '服务器连接失败，请检查网络';
      alert('操作失败: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>十三水 - {isLogin ? '登录' : '注册'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'inline-block', textAlign: 'left' }}>
        <div>
          <input type="text" placeholder="手机号" required 
            style={{ padding: '10px', margin: '5px' }}
            onChange={e => setForm({...form, phone: e.target.value})} />
        </div>
        <div>
          <input type="password" placeholder="密码" required 
            style={{ padding: '10px', margin: '5px' }}
            onChange={e => setForm({...form, password: e.target.value})} />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', marginTop: '10px' }}>
          {loading ? '处理中...' : (isLogin ? '立即登录' : '提交注册')}
        </button>
      </form>
      <div style={{ marginTop: '20px', cursor: 'pointer', color: 'blue' }} onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? '没有账号？点击注册' : '已有账号？返回登录'}
      </div>
    </div>
  );
};

export default Auth;import axios from 'axios';

export const getCardImg = (val) => {
    if (val === 53) return "/assets/cards/black_joker.svg";
    if (val === 54) return "/assets/cards/red_joker.svg";
    const suits = ["spades", "hearts", "diamonds", "clubs"];
    const values = ["ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king"];
    const suitIndex = Math.floor((val - 1) / 13);
    const valueIndex = (val - 1) % 13;
    return `/assets/cards/${values[valueIndex]}_of_${suits[suitIndex]}.svg`;
};

const api = axios.create({
    baseURL: '/api', // 对应 _worker.js 转发
});

// 请求拦截器：处理 Token 和数据格式
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    
    // 如果是 POST 请求，将 JSON 转换为 URLSearchParams (PHP 必须格式)
    if (config.method === 'post' && !(config.data instanceof URLSearchParams)) {
        const params = new URLSearchParams();
        for (const key in config.data) {
            params.append(key, config.data[key]);
        }
        if (token) params.append('token', token);
        config.data = params;
    } else if (config.method === 'get' && token) {
        config.params = { ...config.params, token };
    }
    
    console.log(`发送请求到: ${config.url}`, config.data?.toString());
    return config;
});

export default api;