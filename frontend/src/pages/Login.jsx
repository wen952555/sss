import React, { useState } from 'react';
import { authAPI } from '../utils/api';

const Login = ({ onLogin, onNavigate }) => {
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authAPI.login(formData.phone, formData.password);
      
      // 保存token和用户信息
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      
      onLogin(result.user);
      onNavigate('main');
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFindUserId = async () => {
    const phone = prompt('请输入手机号查找用户ID:');
    if (!phone) return;

    if (!/^1[3-9]\\d{9}$/.test(phone)) {
      alert('请输入有效的手机号');
      return;
    }

    try {
      const result = await authAPI.findUserId(phone);
      alert(`手机号 ${result.phone} 对应的用户ID是: ${result.user_id}`);
    } catch (err) {
      alert(err.message || '查找失败');
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>登录十三水</h2>
        
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="phone">手机号</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder="请输入手机号"
            pattern="1[3-9]\\d{9}"
            maxLength="11"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">密码</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="请输入密码"
            minLength="6"
          />
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>

        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button 
            type="button" 
            className="link-btn" 
            onClick={() => onNavigate('register')}
          >
            注册账号
          </button>
          
          <button 
            type="button" 
            className="link-btn" 
            onClick={handleFindUserId}
          >
            找回用户ID
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;