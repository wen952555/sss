import { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [amount, setAmount] = useState('');
  const navigate = useNavigate();

  const loadProfile = async () => {
    try {
      const res = await api.get('/profile.php');
      setUser(res.data);
    } catch (e) { navigate('/login'); }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleTransfer = async () => {
    if (!foundUser || !amount) return;
    try {
      await api.post('/transfer.php', { to_id: foundUser.short_id, amount });
      alert("赠送成功");
      setFoundUser(null); setAmount('');
      loadProfile();
    } catch (e) { alert(e.response.data.error); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        {/* 用户信息卡片 */}
        <div className="glass-panel p-8 rounded-[2rem] text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
          <p className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-2">Member Profile</p>
          <h2 className="text-4xl font-black mb-1">{user.points}</h2>
          <p className="text-white/40 text-xs uppercase mb-6">Available Credits</p>
          
          <div className="grid grid-cols-2 gap-4 text-sm border-t border-white/10 pt-6">
            <div className="text-left">
              <p className="text-white/40 text-[10px] uppercase">Member ID</p>
              <p className="font-mono font-bold">{user.short_id}</p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-[10px] uppercase">Phone Number</p>
              <p className="font-bold">{user.phone}</p>
            </div>
          </div>
        </div>

        {/* 快捷入口 */}
        <button onClick={() => navigate('/game')} className="w-full bg-white text-black h-16 rounded-2xl font-black text-lg hover:bg-yellow-500 transition-colors shadow-xl">
          开始游戏
        </button>

        {/* 赠送积分 */}
        <div className="glass-panel p-6 rounded-[2rem] space-y-4">
          <h3 className="text-sm font-bold text-center text-white/60">积分赠送服务</h3>
          <div className="flex gap-2">
            <input 
              className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-yellow-500" 
              placeholder="输入对方手机号"
              onChange={async (e) => {
                if (e.target.value.length >= 11) {
                  try {
                    const res = await api.get(`/search.php?phone=${e.target.value}`);
                    setFoundUser(res.data);
                  } catch { setFoundUser(null); }
                }
              }}
            />
          </div>
          
          {foundUser && (
            <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 animate-in fade-in slide-in-from-top-2">
              <p className="text-xs text-yellow-500 mb-2">找到用户 ID: {foundUser.short_id}</p>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  className="w-full bg-black/20 rounded-lg p-2 text-sm focus:outline-none" 
                  placeholder="金额" 
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                <button onClick={handleTransfer} className="bg-yellow-600 text-black px-4 py-2 rounded-lg font-bold text-xs">发送</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}