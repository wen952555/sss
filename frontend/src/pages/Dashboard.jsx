
import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

// Mock hand for demonstration. In a real app, this would come from the game state.
const MOCK_PLAYER_HAND = [
  'ace_of_spades', 'king_of_spades', 'queen_of_spades', 'jack_of_spades', '10_of_spades' 
];

const ReservationBlock = ({ title, onReserve, loading, count, user_has_reserved, top_hands }) => {
    return (
      <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10">
        <h3 className="text-center font-bold text-lg text-yellow-400 mb-2">{title}</h3>
        <p className="text-center text-sm text-white/60 mb-4">当前已有 {loading ? '...' : count} 人预约</p>

        <div className="mb-4 min-h-[80px]">
          <h4 className="text-xs text-white/40 uppercase tracking-widest mb-2 text-center">- 牌型榜 -</h4>
          {loading ? (
             <div className="text-center text-sm text-white/40 italic">加载中...</div>
          ) : top_hands && top_hands.length > 0 ? (
            <ul className="text-center text-sm space-y-1">
              {top_hands.map((hand, index) => (
                <li key={index} className="truncate text-white/80">
                  <span className={`font-bold ${index === 0 ? 'text-yellow-400' : (index === 1 ? 'text-gray-300' : 'text-orange-400')}`}>{index + 1}. {hand.username}</span>: {hand.hand_info}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-sm text-white/40 italic">虚位以待</p>
          )}
        </div>

        <button 
          onClick={onReserve}
          disabled={user_has_reserved || loading}
          className="w-full h-14 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-transform disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? '查询中...' : (user_has_reserved ? '已预约' : '立即预约')}
        </button>
      </div>
    );
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [reservationInfo, setReservationInfo] = useState({
    today: { count: 0, user_has_reserved: false, top_hands: [] },
    tomorrow: { count: 0, user_has_reserved: false, top_hands: [] },
    loading: true
  });
  const navigate = useNavigate();

  const getReservationStatus = useCallback(async () => {
    setReservationInfo(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.get('/get_reservation_status.php');
      const data = res.data;
      if (data && data.today && data.tomorrow) {
        setReservationInfo({
          today: data.today,
          tomorrow: data.tomorrow,
          loading: false
        });
      } else {
         setReservationInfo(prev => ({ ...prev, loading: false }));
      }
    } catch (e) {
      console.error("Could not check reservation status", e);
      setReservationInfo(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      const userRes = await api.get('/profile.php');
      setUser(userRes.data);
      await getReservationStatus();
    } catch {
      navigate('/login');
    }
  }, [navigate, getReservationStatus]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const makeReservation = async (sessionType) => {
    if (reservationInfo[sessionType].user_has_reserved || reservationInfo.loading) return;

    const playerHand = MOCK_PLAYER_HAND; 
    
    try {
      const res = await api.post('/make_reservation.php', {
        session_type: sessionType,
        hand: playerHand 
      });
      alert(res.data.message || '预约成功！');
      await loadInitialData(); // Refresh all data
    } catch (e) {
      alert(e.response?.data?.message || '预约失败，请稍后再试');
    }
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

  if (!user) return <div className="min-h-screen bg-gray-900 flex justify-center items-center"><p className="text-white animate-pulse">加载中...</p></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <div className="max-w-md mx-auto space-y-6">
        
        <div className="bg-gradient-to-b from-white/10 to-transparent p-6 rounded-[2.5rem] border border-white/10 text-center shadow-lg relative">
          <div className="absolute top-4 right-4">
            <button onClick={logout} className="text-white/40 hover:text-white text-xs">退出</button>
          </div>
          <h2 className="text-3xl font-bold text-yellow-400 mb-2">欢迎, {user.username}</h2>
          <p className="text-sm text-white/60">ID: {user.short_id}</p>
        </div>

        <div className="space-y-4">
          <ReservationBlock 
            title="今晚 8 点场"
            onReserve={() => makeReservation('today')}
            loading={reservationInfo.loading}
            {...reservationInfo.today}
          />
          <ReservationBlock 
            title="明晚 8 点场"
            onReserve={() => makeReservation('tomorrow')}
            loading={reservationInfo.loading}
            {...reservationInfo.tomorrow}
          />
        </div>
        
      </div>
    </div>
  );
}
