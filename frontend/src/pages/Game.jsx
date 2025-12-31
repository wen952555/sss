import { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function Game() {
  const [pool, setPool] = useState([]); // 待分配的牌
  const [head, setHead] = useState([]); // 头道 (最多3张)
  const [mid, setMid] = useState([]);  // 中道 (最多5张)
  const [back, setBack] = useState([]); // 尾道 (最多5张)
  const [selectedIndices, setSelectedIndices] = useState([]); // 选中的牌索引
  const navigate = useNavigate();

  // 1. 发牌
  const dealGame = async () => {
    try {
      const res = await api.get('/game_deal.php');
      setPool(res.data.hand);
      setHead([]); setMid([]); setBack([]); setSelectedIndices([]);
    } catch (e) { navigate('/login'); }
  };

  // 2. 选择牌 (多选)
  const toggleSelect = (index) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter(i => i !== index));
    } else {
      setSelectedIndices([...selectedIndices, index]);
    }
  };

  // 3. 移动牌到指定道
  const moveTo = (target, setTarget, limit) => {
    if (selectedIndices.length === 0) return;
    if (target.length + selectedIndices.length > limit) {
      alert(`该道最多只能有 ${limit} 张牌`);
      return;
    }

    const cardsToMove = selectedIndices.map(i => pool[i]);
    const newPool = pool.filter((_, i) => !selectedIndices.includes(i));
    
    setTarget([...target, ...cardsToMove]);
    setPool(newPool);
    setSelectedIndices([]);
  };

  // 4. 重置 (回退到Pool)
  const resetLayout = () => {
    setPool([...pool, ...head, ...mid, ...back]);
    setHead([]); setMid([]); setBack([]); setSelectedIndices([]);
  };

  // 5. 智能理牌 (简单逻辑：按点数大小自动分配)
  const smartSort = () => {
    const allCards = [...pool, ...head, ...mid, ...back];
    // 简单的点数映射用于排序
    const rankMap = { '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, '10':10, 'jack':11, 'queen':12, 'king':13, 'ace':14 };
    const sorted = allCards.sort((a, b) => rankMap[b.split('_')[0]] - rankMap[a.split('_')[0]]);

    setBack(sorted.slice(0, 5));  // 最大的5张放尾道
    setMid(sorted.slice(5, 10));  // 中间的5张放中道
    setHead(sorted.slice(10, 13)); // 剩余3张放头道
    setPool([]);
    setSelectedIndices([]);
  };

  const CardItem = ({ card, index, isSelected, onToggle }) => (
    <div 
      onClick={() => onToggle(index)}
      className={`relative cursor-pointer transition-all duration-200 ${isSelected ? 'ring-4 ring-yellow-400 rounded-lg scale-105' : ''}`}
    >
      <img src={`/cards/${card}.svg`} alt={card} className="w-16 h-22 md:w-20 md:h-28 shadow-lg" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-2">
      <div className="flex justify-between p-2">
        <button onClick={() => navigate('/dashboard')} className="bg-gray-700 px-3 py-1 rounded">返回</button>
        <div className="space-x-2">
          <button onClick={smartSort} className="bg-purple-600 px-3 py-1 rounded font-bold">智能理牌</button>
          <button onClick={dealGame} className="bg-blue-600 px-3 py-1 rounded font-bold">发牌</button>
          <button onClick={resetLayout} className="bg-red-600 px-3 py-1 rounded font-bold">重置</button>
        </div>
      </div>

      <div className="flex flex-col items-center mt-4 space-y-6">
        {/* 头道 */}
        <div 
          onClick={() => moveTo(head, setHead, 3)}
          className="w-full max-w-sm bg-black/30 p-4 rounded-xl border-2 border-dashed border-gray-600 min-h-[120px]"
        >
          <p className="text-center text-xs text-gray-400 mb-2">头道 (点击此处移入)</p>
          <div className="flex justify-center -space-x-6">
            {head.map((c, i) => <img key={i} src={`/cards/${c}.svg`} className="w-16 h-22" />)}
          </div>
        </div>

        {/* 中道 */}
        <div 
          onClick={() => moveTo(mid, setMid, 5)}
          className="w-full max-w-sm bg-black/30 p-4 rounded-xl border-2 border-dashed border-gray-600 min-h-[120px]"
        >
          <p className="text-center text-xs text-gray-400 mb-2">中道 (点击此处移入)</p>
          <div className="flex justify-center -space-x-6">
            {mid.map((c, i) => <img key={i} src={`/cards/${c}.svg`} className="w-16 h-22" />)}
          </div>
        </div>

        {/* 尾道 */}
        <div 
          onClick={() => moveTo(back, setBack, 5)}
          className="w-full max-w-sm bg-black/30 p-4 rounded-xl border-2 border-dashed border-gray-600 min-h-[120px]"
        >
          <p className="text-center text-xs text-gray-400 mb-2">尾道 (点击此处移入)</p>
          <div className="flex justify-center -space-x-6">
            {back.map((c, i) => <img key={i} src={`/cards/${c}.svg`} className="w-16 h-22" />)}
          </div>
        </div>

        {/* 待分配的牌区 (Pool) */}
        <div className="w-full mt-10 bg-gray-800/50 p-4 rounded-t-3xl">
          <p className="text-center text-sm mb-4 font-bold text-blue-300">手中持牌 ({pool.length})</p>
          <div className="grid grid-cols-5 gap-2 md:grid-cols-7 justify-items-center">
            {pool.map((card, index) => (
              <CardItem 
                key={index} 
                card={card} 
                index={index} 
                isSelected={selectedIndices.includes(index)}
                onToggle={toggleSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}