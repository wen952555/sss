import { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({ phone: '', password: '' });
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await api.post('/register.php', form);
      alert("注册成功！");
      navigate('/login');
    } catch (e) {
      alert(e.response.data.error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl mb-4">用户注册</h2>
      <input className="text-black p-2 mb-2" placeholder="手机号" onChange={e => setForm({...form, phone: e.target.value})} />
      <input className="text-black p-2 mb-2" type="password" placeholder="6位密码" onChange={e => setForm({...form, password: e.target.value})} />
      <button className="bg-blue-500 px-4 py-2" onClick={handleRegister}>立即注册</button>
    </div>
  );
}