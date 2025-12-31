import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiPhone, FiStar, FiLogOut, FiCopy } from 'react-icons/fi';
import { RiCoinsLine } from 'react-icons/ri';
import toast from 'react-hot-toast';

const UserInfo = ({ showFullInfo = false }) => {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  
  const handleCopyUserId = () => {
    if (user?.user_id) {
      navigator.clipboard.writeText(user.user_id);
      toast.success('已复制用户ID');
    }
  };
  
  const handleCopyPhone = () => {
    if (user?.phone) {
      navigator.clipboard.writeText(user.phone);
      toast.success('已复制手机号');
    }
  };
  
  if (!user) {
    return (
      <div className="bg-gray-800 text-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-3">
          <FiUser className="text-2xl" />
          <div>
            <div className="font-bold">未登录</div>
            <div className="text-gray-400 text-sm">请登录查看信息</div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!showFullInfo) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold">
              {user.user_id?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="font-bold">ID: {user.user_id}</div>
              <div className="text-sm opacity-90">欢迎回来！</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-black bg-opacity-30 px-3 py-1 rounded-full">
            <RiCoinsLine className="text-yellow-400" />
            <span className="font-bold">{user.points || 0}</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl shadow-xl overflow-hidden">
      {/* 用户头部信息 */}
      <div className="bg-gradient-to-r from-blue-700 to-purple-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white text-blue-700 rounded-full flex items-center justify-center font-bold text-2xl">
              {user.user_id?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user.user_id}</h2>
              <p className="text-blue-200">十三水玩家</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition"
          >
            <FiLogOut />
            <span>退出</span>
          </button>
        </div>
      </div>
      
      {/* 用户详细信息 */}
      <div className="p-6 space-y-6">
        {/* 积分信息 */}
        <div className="bg-gray-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <RiCoinsLine className="text-2xl text-yellow-400" />
              <h3 className="text-xl font-bold">我的积分</h3>
            </div>
            <div className="text-3xl font-bold text-yellow-400">
              {user.points || 0}
            </div>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => setShowTransfer(true)}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold py-2 rounded-lg hover:opacity-90 transition"
            >
              转账
            </button>
            <button className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-2 rounded-lg hover:opacity-90 transition">
              充值
            </button>
          </div>
        </div>
        
        {/* 账户信息 */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center space-x-2">
            <FiUser />
            <span>账户信息</span>
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center">
                  <FiPhone className="text-xl" />
                </div>
                <div>
                  <div className="text-gray-400 text-sm">手机号</div>
                  <div className="font-bold">{user.phone || '未设置'}</div>
                </div>
              </div>
              <button
                onClick={handleCopyPhone}
                className="p-2 hover:bg-gray-600 rounded-lg transition"
                title="复制手机号"
              >
                <FiCopy />
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-900 rounded-lg flex items-center justify-center">
                  <FiStar className="text-xl" />
                </div>
                <div>
                  <div className="text-gray-400 text-sm">用户ID</div>
                  <div className="font-bold">{user.user_id}</div>
                </div>
              </div>
              <button
                onClick={handleCopyUserId}
                className="p-2 hover:bg-gray-600 rounded-lg transition"
                title="复制用户ID"
              >
                <FiCopy />
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-900 rounded-lg flex items-center justify-center">
                  <span className="font-bold">VIP</span>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">会员等级</div>
                  <div className="font-bold">普通会员</div>
                </div>
              </div>
              <button className="px-4 py-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black text-sm font-bold rounded-full">
                升级
              </button>
            </div>
          </div>
        </div>
        
        {/* 统计信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-400">0</div>
            <div className="text-gray-400 text-sm">胜利场次</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-blue-400">0</div>
            <div className="text-gray-400 text-sm">游戏总场次</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-purple-400">0</div>
            <div className="text-gray-400 text-sm">连胜纪录</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-red-400">0%</div>
            <div className="text-gray-400 text-sm">胜率</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;