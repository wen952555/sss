import React, { useState } from 'react';
import { request } from '../api';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ phone: '', password: '' });

  const handleSubmit = async () => {
    if (form.password.length < 6) return alert('密码至少6位');
    const action = isLogin ? 'login' : 'register';
    const res = await request(action, form);
    
    if (res.success) {
      if (isLogin) {
        onLoginSuccess(res.user);
      } else {
        alert(`注册成功！您的ID是: ${res.uid}，请登录`);
        setIsLogin(true);
      }
    } else {
      alert(res.error || '操作失败');
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>{isLogin ? '登录' : '注册'}</h1>
      <input 
        placeholder="手机号" 
        onChange={e => setForm({...form, phone: e.target.value})} 
      /><br/>
      <input 
        type="password" 
        placeholder="6位密码" 
        onChange={e => setForm({...form, password: e.target.value})} 
      /><br/>
      <button onClick={handleSubmit}>{isLogin ? '立即进入' : '注册账号'}</button>
      <p onClick={() => setIsLogin(!isLogin)} style={{ cursor: 'pointer', fontSize: '14px' }}>
        {isLogin ? '没有账号？点击注册' : '已有账号？返回登录'}
      </p>
    </div>
  );
}