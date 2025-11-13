import React, { useState } from 'react';
import { authAPI } from '../utils/api';

const Register = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // 手机号输入时自动过滤非数字字符
    if (name === 'phone') {
      const filteredValue = value.replace(/\D/g, ''); // 移除非数字字符
      setFormData({
        ...formData,
        [name]: filteredValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const validatePhone = (phone) => {
    if (phone.length !== 11) {
      return '手机号必须是11位数字';
    }
    if (!/^1[3-9]/.test(phone)) {
      return '手机号格式不正确';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // 验证手机号
    const phoneError = validatePhone(formData.phone);
    if (phoneError) {
      setError(phoneError);
      setLoading(false);
      return;
    }

    // 验证密码长度
    if (formData.password.length < 6) {
      setError('密码长度至少6位');
      setLoading(false);
      return;
    }

    // 验证密码确认
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    try {
      const result = await authAPI.register(formData.phone, formData.password, formData.email);
      
      setSuccess(`注册成功！您的用户ID是: ${result.user_id}，请妥善保管`);
      
      // 3秒后跳转到登录页面
      setTimeout(() => {
        onNavigate('login');
      }, 3000);
    } catch (err) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>注册账号</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-group">
          <label htmlFor="phone">手机号</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder="请输入11位手机号"
            maxLength="11"
            minLength="11"
          />
          <div style={{ fontSize: '12px', color: '#87CEEB', marginTop: '5px' }}>
            请输入11位手机号
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">邮箱（可选）</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="请输入邮箱"
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
            placeholder="请输入密码（至少6位）"
            minLength="6"
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">确认密码</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            placeholder="请再次输入密码"
            minLength="6"
          />
        </div>

        <button type="submit" className="btn" disabled={loading || success}>
          {loading ? '注册中...' : '注册'}
        </button>

        <button 
          type="button" 
          className="link-btn" 
          onClick={() => onNavigate('login')}
          style={{ marginTop: '15px' }}
        >
          已有账号？点击登录
        </button>
      </form>
    </div>
  );
};

export default Register;