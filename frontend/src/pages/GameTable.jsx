// frontend/src/pages/GameTable.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHand, submitHand } from '../api';
import Card from '../components/Card';

const GameTable = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState(null); 
  const [rows, setRows] = useState([[], [], []]); 
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [selectedCards, setSelectedCards] = useState([]);

  useEffect(() => {
    fetchGame();
  }, []);

  const fetchGame = async () => {
    try {
      setLoading(true);
      const res = await getHand();
      if (res.data.status === 'finished') {
        alert(res.data.message);
        navigate('/lobby');
        return;
      }
      if (res.data.status === 'success') {
        setGameData(res.data);
        const defaultSol = res.data.solutions[0];
        setRows([defaultSol.front, defaultSol.mid, defaultSol.back]);
        setSelectedCards([]);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleSmartSort = () => {
    if (!gameData || !gameData.solutions) return;
    const nextIndex = (solutionIndex + 1) % gameData.solutions.length;
    setSolutionIndex(nextIndex);
    const sol = gameData.solutions[nextIndex];
    setRows([sol.front, sol.mid, sol.back]);
    setSelectedCards([]); 
  };

  const handleCardSelect = (rIndex, cIndex, card) => {
    const existingIdx = selectedCards.findIndex(
      item => item.rIndex === rIndex && item.cIndex === cIndex
    );
    if (existingIdx >= 0) {
      const newSel = [...selectedCards];
      newSel.splice(existingIdx, 1);
      setSelectedCards(newSel);
    } else {
      setSelectedCards([...selectedCards, { rIndex, cIndex, card }]);
    }
  };

  const isSelected = (rIndex, cIndex) => {
    return selectedCards.some(item => item.rIndex === rIndex && item.cIndex === cIndex);
  };

  const handleRowClick = (targetRowIndex) => {
    if (selectedCards.length === 0) return; 
    const newRows = [...rows]; 
    const cardsToMove = selectedCards.map(s => s.card);
    for (let i = 0; i < 3; i++) {
      newRows[i] = newRows[i].filter(card => {
        const isMoving = cardsToMove.some(c => c.suit === card.suit && c.rank === card.rank);
        return !isMoving;
      });
    }
    newRows[targetRowIndex] = [...newRows[targetRowIndex], ...cardsToMove];
    setRows(newRows);
    setSelectedCards([]); 
  };

  const handleSubmit = async () => {
    if (rows[0].length !== 3 || rows[1].length !== 5 || rows[2].length !== 5) {
      alert("牌型不合法！\n头道需 3 张，中/尾道需 5 张。");
      return;
    }
    try {
      await submitHand(gameData.session_id, gameData.deck_id, {
        front: rows[0], mid: rows[1], back: rows[2]
      });
      fetchGame();
    } catch (e) {
      alert("提交失败");
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center bg-green-900 text-white">正在连接...</div>;

  return (
    <div className="h-full w-full bg-gradient-to-b from-green-800 to-green-950 text-white flex flex-col overflow-hidden">
      <div className="bg-black/20 backdrop-blur-sm p-3 flex justify-between items-center shadow-sm shrink-0">
        <div>
          <h1 className="font-bold text-lg tracking-wider text-yellow-400">十三水</h1>
          <p className="text-xs text-gray-300">{gameData?.round_info}</p>
        </div>
        <button onClick={() => navigate('/lobby')} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded border border-white/20">
          返回大厅
        </button>
      </div>

      <div className="flex-1 flex flex-col p-2 max-w-4xl mx-auto w-full gap-1 overflow-hidden">
        
        <div className="text-center text-xs text-green-200/70 mb-1 shrink-0 h-5">
          {selectedCards.length > 0 
            ? `已选中 ${selectedCards.length} 张，点击目标牌墩移动` 
            : '点击扑克牌进行多选'}
        </div>

        {/* 牌墩区域 */}
        {/* 使用 h-1/4 和 h-1/3 这种比例来分配高度，让牌尽可能大 */}
        
        {/* --- 头道 (3张) - 占 25% 高度 --- */}
        <div 
          onClick={() => handleRowClick(0)}
          className={`
            h-[25%] border-b border-dashed border-white/10 relative
            flex items-center pl-4 pr-2
            ${selectedCards.length > 0 ? 'bg-white/5 cursor-pointer' : ''}
          `}
        >
          <div className="absolute left-0 top-1 text-[10px] font-bold text-yellow-500/50 px-1">头道</div>
          {/* justify-start + gap-2 实现左对齐且有间距 */}
          <div className="flex gap-2 h-[85%] w-full justify-start items-center overflow-x-auto no-scrollbar">
            {rows[0].map((card, i) => (
              <Card 
                key={`${card.suit}-${card.rank}`} 
                card={card} 
                selected={isSelected(0, i)}
                onClick={() => handleCardSelect(0, i, card)}
              />
            ))}
          </div>
        </div>

        {/* --- 中道 (5张) - 占 35% 高度 --- */}
        <div 
          onClick={() => handleRowClick(1)}
          className={`
            h-[35%] border-b border-dashed border-white/10 relative
            flex items-center pl-4 pr-2
            ${selectedCards.length > 0 ? 'bg-white/5 cursor-pointer' : ''}
          `}
        >
          <div className="absolute left-0 top-1 text-[10px] font-bold text-yellow-500/50 px-1">中道</div>
          <div className="flex gap-2 h-[85%] w-full justify-start items-center overflow-x-auto no-scrollbar">
            {rows[1].map((card, i) => (
              <Card 
                key={`${card.suit}-${card.rank}`} 
                card={card} 
                selected={isSelected(1, i)}
                onClick={() => handleCardSelect(1, i, card)}
              />
            ))}
          </div>
        </div>

        {/* --- 尾道 (5张) - 占 35% 高度 --- */}
        <div 
          onClick={() => handleRowClick(2)}
          className={`
            h-[35%] relative
            flex items-center pl-4 pr-2
            ${selectedCards.length > 0 ? 'bg-white/5 cursor-pointer' : ''}
          `}
        >
          <div className="absolute left-0 top-1 text-[10px] font-bold text-yellow-500/50 px-1">尾道</div>
          <div className="flex gap-2 h-[85%] w-full justify-start items-center overflow-x-auto no-scrollbar">
            {rows[2].map((card, i) => (
              <Card 
                key={`${card.suit}-${card.rank}`} 
                card={card} 
                selected={isSelected(2, i)}
                onClick={() => handleCardSelect(2, i, card)}
              />
            ))}
          </div>
        </div>

      </div>

      <div className="bg-black/40 backdrop-blur-md p-3 flex gap-4 items-center justify-center shadow-[0_-4px_20px_rgba(0,0,0,0.3)] shrink-0">
        <button 
          onClick={handleSmartSort}
          className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex flex-col items-center leading-tight"
        >
          <span className="text-sm">智能理牌</span>
          <span className="text-xs font-normal opacity-80">{['稳健型', '同花/顺子优先', '对子优先'][solutionIndex]}</span>
        </button>
        
        <button 
          onClick={handleSubmit}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
        >
          确认出牌
        </button>
      </div>
    </div>
  );
};

export default GameTable;
