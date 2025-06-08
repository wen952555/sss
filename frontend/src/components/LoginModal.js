import React, { useState } from 'react';

const LoginModal = ({ onClose, onLogin }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = () => {
    if (!phone || !password) {
      setError('手机号和密码不能为空');
      return;
    }
    
    onLogin(phone, password);
  };
  
  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>登录账号</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <input
            type="tel"
            placeholder="手机号"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <div style={{ color: 'red' }}>{error}</div>}
          <button onClick={handleSubmit}>登录</button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
