import { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState('');
  const [target, setTarget] = useState(null);
  const [amount, setAmount] = useState('');
  const [reservationStatus, setReservationStatus] = useState({ reserved: false, loading: true });
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await api.get('/profile.php');
      setUser(res.data);
      checkReservation();
    } catch { navigate('/login'); }
  };

  const checkReservation = async () => {
    try {
        const res = await api.get('/get_reservation_status.php');
        setReservationStatus({ reserved: res.data.has_reservation, loading: false });
    } catch (e) {
        console.error("Could not check reservation status", e);
        setReservationStatus({ reserved: false, loading: false });
    }
  };

  useEffect(() => { load(); }, []);

  const makeReservation = async () => {
    if (reservationStatus.reserved) return;
    try {
      await api.post('/make_reservation.php');
      alert('预约成功! 今晚8点请准时开始游戏。');
      setReservationStatus({ reserved: true, loading: false });
      load(); // Reload user data to show updated points
    } catch (e) {
      alert(e.response?.data?.message || '预约失败，请稍后再试');
    }
  }

  const search = async () => {
    try {
      const res = await api.get(`/search.php?phone=${phone}`);
      setTarget(res.data);
    } catch { alert("未找到该用户"); }
  };

  const transfer = async () => {
    try {
      await api.post('/transfer.php', { to_id: target.short_id, amount });
      alert("赠送成功");
      setTarget(null); setAmount(''); load();
    } catch (e) { alert(e.response.data.error); }
  };

  const logout = async () => {
    try {
      await api.post('/logout.php');
      navigate('/login');
    } catch (e) {
      console.error('Logout failed', e);
      navigate('/login');
    }
  };

  if (!user) return <div className="min-h-screen bg-gradient-to-b from-[#064e3b] to-[#022c22] flex justify-center items-center"><p className="text-white animate-pulse">加载中...</p></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#064e3b] to-[#022c22] text-white p-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-gradient-to-b from-white/10 to-transparent p-8 rounded-[2.5rem] border border-white/10 text-center shadow-lg">
          <div className="w-16 h-1 bg-yellow-500 mx-auto mb-6 rounded-full"></div>
          <p className="text-xs text-white/40 uppercase tracking-widest mb-1">当前余额</p>
          <h2 className="text-5xl font-black text-yellow-500 mb-6">{user.points}</h2>
          <div className="flex justify-between text-sm px-4 text-white/60">
            <span>ID: {user.short_id}</span>
            <span>账号: {user.phone}</span>
          </div>
        </div>

        <button 
          onClick={makeReservation} 
          disabled={reservationStatus.reserved || reservationStatus.loading}
          className="w-full h-16 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-black text-xl shadow-lg hover:scale-105 transition-transform disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {reservationStatus.loading ? '正在查询预约状态...' : (reservationStatus.reserved ? '已预约今日比赛' : '预约今晚比赛 (10 积分)')}
        </button>

        <button onClick={() => navigate('/game')} className="w-full h-16 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded-2xl font-black text-xl shadow-lg hover:scale-105 transition-transform">
          进入游戏
        </button>

        <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
          <h3 className="text-center font-bold text-white/60 mb-4">积分转账</h3>
          <div className="flex gap-2 mb-4">
            <input className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none" placeholder="输入接收者手机号" value={phone} onChange={e => setPhone(e.target.value)} />
            <button onClick={search} className="bg-white/10 px-4 rounded-xl text-xs hover:bg-white/20">搜索</button>
          </div>

          {target && (
            <div className="bg-yellow-500/10 p-4 rounded-2xl border border-yellow-500/20 animate-in fade-in">
              <p className="text-xs text-yellow-500 mb-3">接收人ID: {target.short_id}</p>
              <div className="flex gap-2">
                <input type="number" className="flex-1 bg-black/30 rounded-lg px-3 py-2 text-sm outline-none" placeholder="输入金额" value={amount} onChange={e => setAmount(e.target.value)} />
                <button onClick={transfer} className="bg-yellow-600 text-black px-4 py-2 rounded-lg font-bold text-xs hover:bg-yellow-500">确定</button>
              </div>
            </div>
          )}
        </div>

        <button onClick={logout} className="w-full h-16 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl font-black text-xl shadow-lg hover:scale-105 transition-transform">
          退出登录
        </button>

      </div>
    </div>
  );
}