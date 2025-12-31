import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminPanel from '../components/AdminPanel';
import { FiShield, FiBarChart2, FiSettings } from 'react-icons/fi';

const Admin = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }
  
  // 检查是否为管理员
  if (!user?.is_admin) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* 管理面板头部 */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl">
              <FiShield className="text-2xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">管理员面板</h1>
              <p className="text-gray-400">管理用户账户、积分和游戏设置</p>
            </div>
          </div>
          
          {/* 管理导航 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-sm">总用户数</div>
                  <div className="text-2xl font-bold">0</div>
                </div>
                <FiShield className="text-3xl text-purple-500" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-sm">今日活跃</div>
                  <div className="text-2xl font-bold">0</div>
                </div>
                <FiBarChart2 className="text-3xl text-blue-500" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-400 text-sm">总积分</div>
                  <div className="text-2xl font-bold">0</div>
                </div>
                <FiSettings className="text-3xl text-green-500" />
              </div>
            </div>
          </div>
        </div>
        
        {/* 主管理内容 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AdminPanel />
          </div>
          
          {/* 右侧：快速操作 */}
          <div className="space-y-6">
            {/* 系统状态 */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl">
              <h3 className="text-xl font-bold mb-4">系统状态</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">API服务</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400">正常</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">数据库</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400">正常</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Telegram Bot</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400">已连接</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 快速操作 */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl">
              <h3 className="text-xl font-bold mb-4">快速操作</h3>
              <div className="space-y-3">
                <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:opacity-90 transition">
                  发送公告
                </button>
                <button className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg hover:opacity-90 transition">
                  重置游戏数据
                </button>
                <button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg hover:opacity-90 transition">
                  备份数据库
                </button>
                <button className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg hover:opacity-90 transition">
                  系统日志
                </button>
              </div>
            </div>
            
            {/* Telegram Bot 状态 */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl">
              <h3 className="text-xl font-bold mb-4">Telegram Bot</h3>
              <div className="space-y-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-gray-400 text-sm">机器人状态</div>
                  <div className="font-bold text-green-400">在线</div>
                </div>
                <div className="text-sm text-gray-400">
                  <p>🤖 管理命令：</p>
                  <ul className="mt-2 space-y-1">
                    <li>/users - 查看所有用户</li>
                    <li>/search [手机号] - 搜索用户</li>
                    <li>/delete [用户ID] - 删除用户</li>
                    <li>/points [用户ID] [积分] - 设置积分</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;