import { useState } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ phone: '', password: '' });
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await api.post('/login.php', form);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (e) {
      alert("登录失败: " + (e.response?.data?.error || "未知错误"));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <h1 className="text-3xl font-bold">十三水游戏</h1>
      <input className="text-black p-2 w-64 rounded" placeholder="手机号" onChange={e => setForm({...form, phone: e.target.value})} />
      <input className="text-black p-2 w-64 rounded" type="password" placeholder="密码" onChange={e => setForm({...form, password: e.target.value})} />
      <button className="bg-blue-600 w-64 py-2 rounded font-bold" onClick={handleLogin}>登录</button>
      <Link to="/register" className="text-blue-400">没有账号？去注册</Link>
    </div>
  );
}