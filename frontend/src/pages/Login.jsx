import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiSmartphone, FiLock, FiLogIn } from 'react-icons/fi';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!phone.trim() || !password.trim()) {
      toast.error('请输入手机号和密码');
      return;
    }
    
    if (password.length !== 6) {
      toast.error('密码必须为6位');
      return;
    }
    
    setLoading(true);
    const result = await login(phone, password);
    setLoading(false);
    
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-r from-yellow-500 to-red-500 rounded-2xl mb-4">
            <div className="text-4xl font-bold">🃏</div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">十三水游戏</h1>
          <p className="text-gray-300">经典扑克牌游戏，智慧与运气的对决</p>
        </div>
        
        {/* 登录表单 */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">用户登录</h2>
              <p className="text-gray-400">请输入您的手机号和密码</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 手机号输入 */}
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-bold">
                  <FiSmartphone className="inline mr-2" />
                  手机号
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入您的手机号"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              {/* 密码输入 */}
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-bold">
                  <FiLock className="inline mr-2" />
                  密码（6位）
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入6位密码"
                  maxLength="6"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    登录中...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <FiLogIn className="mr-2" />
                    登录
                  </span>
                )}
              </button>
            </form>
            
            {/* 注册链接 */}
            <div className="mt-6 text-center">
              <p className="text-gray-400">
                还没有账户？
                <Link to="/register" className="text-blue-400 hover:text-blue-300 ml-2 font-bold">
                  立即注册
                </Link>
              </p>
            </div>
          </div>
          
          {/* 底部信息 */}
          <div className="bg-gray-900 bg-opacity-50 p-4 text-center">
            <p className="text-gray-500 text-sm">
              测试账号: 13800138000 / 123456
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;