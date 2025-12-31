import { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState(null); // 当前登录用户
  const [searchPhone, setSearchPhone] = useState(''); // 搜索框输入
  const [foundUser, setFoundUser] = useState(null); // 搜索结果
  const [transferAmount, setTransferAmount] = useState(''); // 转账金额
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1. 初始化加载个人资料
  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile.php');
      setUser(res.data);
      setLoading(false);
    } catch (e) {
      console.error("未登录或会话过期");
      navigate('/login');
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // 2. 搜索手机号查ID
  const handleSearch = async () => {
    if (!searchPhone) return alert("请输入手机号");
    try {
      const res = await api.get(`/search.php?phone=${searchPhone}`);
      setFoundUser(res.data); // 返回格式: { short_id: 'xxxx' }
    } catch (e) {
      alert("未找到该用户");
      setFoundUser(null);
    }
  };

  // 3. 赠送积分逻辑
  const handleTransfer = async () => {
    if (!foundUser || !transferAmount) return alert("请先搜索用户并输入金额");
    if (parseInt(transferAmount) > user.points) return alert("积分余额不足");

    try {
      const res = await api.post('/transfer.php', {
        to_id: foundUser.short_id,
        amount: transferAmount
      });
      if (res.data.success) {
        alert(`成功赠送 ${transferAmount} 积分给 ID: ${foundUser.short_id}`);
        setTransferAmount('');
        setFoundUser(null);
        setSearchPhone('');
        fetchProfile(); // 刷新余额
      }
    } catch (e) {
      alert(e.response?.data?.error || "转账失败");
    }
  };

  // 4. 退出登录
  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) return <div className="p-10 text-center">加载中...</div>;

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* 个人信息卡片 */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-blue-400">个人中心</h2>
          <button onClick={handleLogout} className="text-xs text-red-400 border border-red-400 px-2 py-1 rounded">退出</button>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-gray-400">我的ID: <span className="text-white font-mono bg-gray-700 px-2 rounded">{user.short_id}</span></p>
          <p className="text-gray-400">手机号: <span className="text-white">{user.phone}</span></p>
          <div className="mt-4 bg-blue-900/30 p-4 rounded-lg border border-blue-500/50">
            <p className="text-sm text-blue-200">当前积分余额</p>
            <p className="text-3xl font-black text-yellow-400">{user.points}</p>
          </div>
        </div>
      </div>

      {/* 游戏入口 */}
      <Link to="/game" className="block w-full bg-green-600 hover:bg-green-500 text-center py-4 rounded-xl font-bold text-lg shadow-lg transition">
        进入十三水游戏
      </Link>

      {/* 赠送积分模块 */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <h3 className="text-lg font-bold mb-4">赠送积分</h3>
        
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="搜索对方手机号" 
            className="flex-1 bg-gray-900 border border-gray-600 p-2 rounded text-white"
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
          />
          <button onClick={handleSearch} className="bg-blue-600 px-4 rounded text-sm">搜索</button>
        </div>

        {foundUser && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg animate-fade-in">
            <p className="text-sm text-gray-300">找到用户 ID: <span className="text-white font-bold">{foundUser.short_id}</span></p>
            <div className="mt-3 flex gap-2">
              <input 
                type="number" 
                placeholder="输入赠送金额" 
                className="flex-1 bg-gray-900 border border-gray-600 p-2 rounded text-white"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
              <button 
                onClick={handleTransfer}
                className="bg-yellow-600 hover:bg-yellow-500 px-4 rounded text-sm font-bold"
              >
                确认赠送
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <p className="text-center text-gray-500 text-xs">
        * 积分仅限游戏内部娱乐使用
      </p>
    </div>
  );
}