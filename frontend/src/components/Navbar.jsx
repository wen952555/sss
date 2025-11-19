import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchUser, transferPoints } from '../api';

const Navbar = ({ user, refreshUser }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResult, setSearchResult] = useState(null); // { game_id }
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('game_token');
    localStorage.removeItem('game_user');
    navigate('/login');
  };

  const handleSearch = async () => {
    try {
      const res = await searchUser(searchPhone);
      if (res.data.status === 'success') {
        setSearchResult(res.data);
        setMsg('');
      } else {
        setSearchResult(null);
        setMsg('用户未找到');
      }
    } catch (e) {
      setMsg('搜索出错');
    }
  };

  const handleTransfer = async () => {
    if (!searchResult || !amount) return;
    try {
      const res = await transferPoints(searchResult.game_id, amount);
      if (res.data.status === 'success') {
        alert('转账成功！');
        setAmount('');
        setShowModal(false);
        if (refreshUser) refreshUser(); // 刷新余额
      } else {
        setMsg(res.data.message);
      }
    } catch (e) {
      setMsg('转账失败');
    }
  };

  return (
    <nav className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
      <div className="font-bold text-lg">十三水 ({user?.game_id})</div>
      <div className="flex gap-4 items-center">
        <span className="text-yellow-300 font-mono">💰 {user?.points}</span>
        <button onClick={() => setShowModal(true)} className="bg-blue-500 px-3 py-1 rounded hover:bg-blue-400 text-sm">
          积分管理
        </button>
        <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded hover:bg-red-400 text-sm">
          退出
        </button>
      </div>

      {/* 积分弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white text-gray-800 p-6 rounded-lg w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">积分转账</h3>
            
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="输入对方手机号" 
                className="border p-2 flex-1 rounded"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
              />
              <button onClick={handleSearch} className="bg-gray-200 px-4 rounded">搜索</button>
            </div>

            {msg && <p className="text-red-500 mb-2 text-sm">{msg}</p>}

            {searchResult && (
              <div className="bg-green-50 p-3 rounded mb-4 border border-green-200">
                <p className="text-sm">目标ID: <span className="font-bold">{searchResult.game_id}</span></p>
                <input 
                  type="number" 
                  placeholder="转账金额" 
                  className="border p-2 w-full mt-2 rounded"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button 
                  onClick={handleTransfer}
                  className="bg-green-500 text-white w-full mt-3 py-2 rounded hover:bg-green-600"
                >
                  确认转账
                </button>
              </div>
            )}

            <button onClick={() => setShowModal(false)} className="text-gray-500 w-full mt-2 text-sm">取消</button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;