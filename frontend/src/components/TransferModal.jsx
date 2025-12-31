import React, { useState, useEffect } from 'react';
import { userAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { FiSend, FiSearch, FiUser } from 'react-icons/fi'; // Fi系列从fi导入
import { RiCoinsLine } from 'react-icons/ri'; // Ri系列从ri导入

const TransferModal = ({ isOpen, onClose, currentUserId, currentPoints }) => {
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  
  useEffect(() => {
    if (!isOpen) {
      setSearchPhone('');
      setSearchResults([]);
      setSelectedUser(null);
      setTransferAmount('');
    }
  }, [isOpen]);
  
  const handleSearch = async () => {
    if (!searchPhone.trim()) {
      toast.error('请输入手机号');
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await userAPI.searchByPhone(searchPhone);
      if (response.success) {
        setSearchResults(response.users || []);
        if (response.users.length === 0) {
          toast.info('未找到相关用户');
        }
      } else {
        toast.error(response.error || '搜索失败');
      }
    } catch (error) {
      toast.error('搜索失败，请稍后重试');
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleTransfer = async () => {
    if (!selectedUser) {
      toast.error('请选择转账对象');
      return;
    }
    
    if (!transferAmount || isNaN(transferAmount) || Number(transferAmount) <= 0) {
      toast.error('请输入有效的转账金额');
      return;
    }
    
    const amount = Number(transferAmount);
    if (amount > currentPoints) {
      toast.error('积分不足');
      return;
    }
    
    if (selectedUser.user_id === currentUserId) {
      toast.error('不能给自己转账');
      return;
    }
    
    setIsTransferring(true);
    try {
      const response = await userAPI.transferPoints(selectedUser.user_id, amount);
      if (response.success) {
        toast.success('转账成功！');
        onClose(true);
      } else {
        toast.error(response.error || '转账失败');
      }
    } catch (error) {
      toast.error('转账失败，请稍后重试');
    } finally {
      setIsTransferring(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-purple-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FiSend className="text-2xl text-white" />
              <h2 className="text-2xl font-bold text-white">积分转账</h2>
            </div>
            <button
              onClick={() => onClose(false)}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>
          <div className="mt-2 text-blue-200">
            当前积分: <span className="font-bold text-yellow-300">{currentPoints}</span>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">搜索用户</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  placeholder="输入手机号搜索"
                  className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  <FiSearch className="text-xl" />
                </button>
              </div>
            </div>
            
            {searchResults.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-gray-400 text-sm mb-2">搜索结果</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.user_id}
                      onClick={() => setSelectedUser(user)}
                      className={`
                        p-3 rounded-lg cursor-pointer transition
                        ${selectedUser?.user_id === user.user_id
                          ? 'bg-gradient-to-r from-blue-900 to-purple-900 border border-blue-500'
                          : 'bg-gray-700 hover:bg-gray-600'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FiUser className="text-gray-400" />
                          <div>
                            <div className="font-bold text-white">{user.user_id}</div>
                            <div className="text-gray-400 text-sm">{user.phone}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 text-yellow-400">
                          <RiCoinsLine />
                          <span className="font-bold">{user.points}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {selectedUser && (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-gray-400 text-sm">转账对象</div>
                      <div className="font-bold text-white">{selectedUser.user_id}</div>
                      <div className="text-gray-400 text-sm">{selectedUser.phone}</div>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      重选
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">转账金额</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="输入转账金额"
                      min="1"
                      max={currentPoints}
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      积分
                    </div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <div className="text-gray-400 text-sm">
                      最大可转: <span className="text-yellow-400">{currentPoints}</span>
                    </div>
                    <div className="text-sm">
                      {transferAmount && (
                        <span className="text-blue-400">
                          转账后剩余: {currentPoints - Number(transferAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {[10, 50, 100, 200].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTransferAmount(amount.toString())}
                      className="bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
                    >
                      {amount}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={handleTransfer}
                  disabled={isTransferring || !transferAmount || Number(transferAmount) > currentPoints}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-4 rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTransferring ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      转账中...
                    </span>
                  ) : (
                    `确认转账 ${transferAmount || 0} 积分`
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferModal;