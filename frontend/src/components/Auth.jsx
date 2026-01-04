import React, { useState } from 'react';
import api from '../api';

export default function Auth({ onLoginSuccess }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const res = await api.post('/auth.php?action=login', { phone, password });
    if (res.success) {
      onLoginSuccess(res.user);
    }
  };

  return (
    <div>
      <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
