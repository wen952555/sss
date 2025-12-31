import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiSmartphone, FiLock, FiUserPlus, FiCheckCircle } from 'react-icons/fi';

const Register = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: 输入信息，2: 注册成功
  const [userId, setUserId] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    if (!phone.trim()) {
      toast.error('请输入手机号');
      return false;
    }
    
    if (!/^[0-9]{10,15}$/.test(phone)) {
      toast.error('手机号格式不正确');
      return false;
    }
    
    if (!password) {
      toast.error('请输入密码');
      return false;
    }
    
    if (password.length !== 6) {
      toast.error('密码必须为6位');
      return false;
    }
    
    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    const result = await register(phone, password);
    setLoading(false);
    
    if (result.success) {
      setUserId(result.user_id);
      setStep(2);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl mb-4">
            <div className="text-4xl font-bold">🃏</div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">加入十三水</h1>
          <p className="text-gray-300">开启您的扑克牌竞技之旅</p>
        </div>
        
        {/* 注册表单 */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {step === 1 ? (
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">创建账户</h2>
                <p className="text-gray-400">请填写注册信息</p>
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
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <p className="text-gray-500 text-sm mt-1">
                    * 无需验证，仅用于账号识别
                  </p>
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
                    placeholder="请设置6位密码"
                    maxLength="6"
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                
                {/* 确认密码 */}
                <div>
                  <label className="block text-gray-300 mb-2 text-sm font-bold">
                    <FiLock className="inline mr-2" />
                    确认密码
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    maxLength="6"
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                
                {/* 协议条款 */}
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="terms"
                    className="mt-1"
                    required
                  />
                  <label htmlFor="terms" className="text-gray-400 text-sm">
                    我已阅读并同意
                    <a href="#" className="text-green-400 hover:text-green-300 mx-1">
                      用户协议
                    </a>
                    和
                    <a href="#" className="text-green-400 hover:text-green-300 mx-1">
                      隐私政策
                    </a>
                  </label>
                </div>
                
                {/* 注册按钮 */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      注册中...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <FiUserPlus className="mr-2" />
                      立即注册
                    </span>
                  )}
                </button>
              </form>
              
              {/* 登录链接 */}
              <div className="mt-6 text-center">
                <p className="text-gray-400">
                  已有账户？
                  <Link to="/login" className="text-green-400 hover:text-green-300 ml-2 font-bold">
                    立即登录
                  </Link>
                </p>
              </div>
            </div>
          ) : (
            /* 注册成功页面 */
            <div className="p-8 text-center">
              <div className="inline-block p-4 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mb-6">
                <FiCheckCircle className="text-4xl text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">注册成功！</h2>
              <p className="text-gray-300 mb-6">
                欢迎加入十三水游戏，您的账户已创建成功
              </p>
              
              {/* 用户ID卡片 */}
              <div className="bg-gradient-to-r from-yellow-900 to-yellow-800 rounded-xl p-6 mb-8">
                <div className="text-yellow-200 text-sm mb-2">您的用户ID</div>
                <div className="text-3xl font-bold text-white mb-2">{userId}</div>
                <div className="text-yellow-300 text-sm">
                  * 请妥善保管，这是您账户的唯一标识
                </div>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={handleGoToLogin}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold py-3 rounded-lg hover:opacity-90 transition"
                >
                  立即登录
                </button>
                
                <div className="text-gray-400 text-sm p-4 bg-gray-800 rounded-lg">
                  <p className="mb-2">💡 温馨提示：</p>
                  <ul className="text-left space-y-1">
                    <li>• 用户ID是您账户的唯一标识</li>
                    <li>• 请勿将密码告诉他人</li>
                    <li>• 初始获得1000积分</li>
                    <li>• 可通过转账功能与好友互动</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* 底部信息 */}
          <div className="bg-gray-900 bg-opacity-50 p-4 text-center">
            <p className="text-gray-500 text-sm">
              注册即代表您同意我们的服务条款
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;