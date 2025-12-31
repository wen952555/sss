import { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function Game() {
  const [hand, setHand] = useState([]);
  const navigate = useNavigate();

  const drawCards = async () => {
    try {
      const res = await api.get('/game_deal.php');
      setHand(res.data.hand);
    } catch (e) {
      alert("请先登录");
      navigate('/login');
    }
  };

  // 图片映射函数
  const getCardImg = (name) => `/cards/${name}.svg`;

  return (
    <div className="min-h-screen bg-green-900 p-4 flex flex-col items-center">
      <div className="flex justify-between w-full max-w-2xl mb-8">
        <button onClick={() => navigate('/dashboard')} className="bg-white/20 px-4 py-2 rounded">返回大厅</button>
        <button onClick={drawCards} className="bg-yellow-500 text-black px-6 py-2 rounded-full font-bold shadow-xl">重新发牌</button>
      </div>

      {hand.length > 0 ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* 头道 3张 */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-green-200 mb-2">头道 (3张)</span>
            <div className="flex -space-x-8">
              {hand.slice(0, 3).map((c, i) => (
                <img key={i} src={getCardImg(c)} className="w-20 h-28 border border-gray-400 rounded-lg shadow-2xl transition-transform hover:-translate-y-4" />
              ))}
            </div>
          </div>

          {/* 中道 5张 */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-green-200 mb-2">中道 (5张)</span>
            <div className="flex -space-x-8">
              {hand.slice(3, 8).map((c, i) => (
                <img key={i} src={getCardImg(c)} className="w-20 h-28 border border-gray-400 rounded-lg shadow-2xl transition-transform hover:-translate-y-4" />
              ))}
            </div>
          </div>

          {/* 尾道 5张 */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-green-200 mb-2">尾道 (5张)</span>
            <div className="flex -space-x-8">
              {hand.slice(8, 13).map((c, i) => (
                <img key={i} src={getCardImg(c)} className="w-20 h-28 border border-gray-400 rounded-lg shadow-2xl transition-transform hover:-translate-y-4" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-20 text-green-300 text-center">
          <div className="text-6xl mb-4">🎴</div>
          <p>准备就绪，点击上方按钮开始发牌</p>
        </div>
      )}
    </div>
  );
}