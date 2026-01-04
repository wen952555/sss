import React, { useState } from 'react';
import { login, register } from '../api';
import '../Auth.css'; // 引入样式文件

export default function Auth({ onLoginSuccess }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!phone || !password) {
      setError('手机号和密码不能为空');
      return;
    }

    try {
        const apiCall = isRegister ? register : login;
        const result = await apiCall(phone, password);

        if (result.success) {
            if(isRegister) {
                setMessage(`注册成功！您的ID是: ${result.short_id}. 请使用手机号登录.`);
                setIsRegister(false); // 切换回登录视图
                // 清空输入框
                setPhone('');
                setPassword('');
            } else {
                onLoginSuccess(result.user);
            }
        } else {
          setError(result.error || '操作失败');
        }
    } catch (err) {
        setError('网络或服务器错误，请稍后再试');
    }
  };

  return (
    <div className="auth-container">
        <h2>{isRegister ? '创建账户' : '欢迎回来'}</h2>
        <form onSubmit={handleSubmit}>
            <div className="auth-form-group">
                <input 
                    type="text" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="手机号"
                />
            </div>
            <div className="auth-form-group">
                <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="密码"
                />
            </div>

            {error && <p className="auth-error-message">{error}</p>}
            {message && <p className="auth-success-message">{message}</p>}
            
            <button type="submit" className="auth-button">
                {isRegister ? '注册' : '登录'}
            </button>
        </form>
        <button 
            onClick={() => { 
                setIsRegister(!isRegister); 
                setError(''); 
                setMessage(''); 
            }} 
            className="auth-toggle-button"
        >
            {isRegister ? '已有账户？去登录' : '没有账户？去注册'}
        </button>
    </div>
  );
}
