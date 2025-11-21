// frontend/src/pages/GameTable.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHand, submitHand } from '../api';
import Card from '../components/Card';

const GameTable = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // 新增错误状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameData, setGameData] = useState(null); 
  const [rows, setRows] = useState([[], [], []]); 
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [selectedCards, setSelectedCards] = useState([]);

  useEffect(() => {
    fetchGame();
  }, []);

  const fetchGame = async () => {
    try {
      setError(null);
      if (!gameData) setLoading(true);
      
      const res = await getHand();
      
      if (res.data.status === 'finished') {
        alert(res.data.message);
        navigate('/lobby');
        return;
      }
      
      if (res.data.status === 'retry') {
          // 后端正在修复数据，自动重试
          console.log("Retrying...");
          setTimeout(fetchGame, 800);
          return;
      }

      if (res.data.status === 'success') {
        setGameData(res.data);
        const defaultSol = res.data.solutions[0];
        setRows([defaultSol.front, defaultSol.mid, defaultSol.back]);
        setSelectedCards([]);
        setSolutionIndex(0);
        setLoading(false);
      } else {
        throw new Error(res.data.message || "未知错误");
      }
    } catch (e) {
      console.error(e);
      setError("无法加载牌局，可能是数据同步问题。");
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
    if (isSubmitting) return; 

    if (rows[0].length !== 3 || rows[1].length !== 5 || rows[2].length !== 5) {
      alert("牌型不合法！\n头道需 3 张，中/尾道需 5 张。");
      return;
    }
    
    setIsSubmitting(true); 

    try {
      const res = await submitHand(gameData.session_id, gameData.deck_id, {
        front: rows[0], mid: rows[1], back: rows[2]
      });
      
      if (res.data.status === 'success') {
          setGameData(null); 
          await fetchGame();
      } else {
          alert("提交失败: " + (res.data.message || "未知错误"));
      }
    } catch (e) {
      alert("网络错误，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 错误界面 ---
  if (error) {
    return (
        <div className="h-full w-full bg-[#1a472a] text-white flex flex-col items-center justify-center gap-4">
            <div className="text-xl font-bold text-red-400">⚠️ {error}</div>
            <button 
                onClick={() => navigate('/lobby')} 
                className="bg-white/20 px-6 py-3 rounded-lg hover:bg-white/30 font-bold"
            >
                返回大厅 (重置)
            </button>
            <button 
                onClick={() => window.location.reload()} 
                className="text-sm text-gray-400 underline"
            >
                刷新页面
            </button>
        </div>
    );
  }

  if (loading || !gameData) return <div className="h-full flex items-center justify-center bg-[#1a472a] text-white font-bold text-xl animate-pulse">正在连接牌桌...</div>;

  return (
    <div key={gameData.deck_id} className="h-full w-full bg-[#1a472a] text-white flex flex-col overflow-hidden select-none">
      <div className="bg-black/30 p-3 flex justify-between items-center shadow-md shrink-0 z-50">
        <div>
          <h1 className="font-bold text-lg text-yellow-400 tracking-widest">十三水</h1>
          <p className="text-xs text-gray-300 opacity-80">{gameData?.round_info}</p>
        </div>
        <button onClick={() => navigate('/lobby')} className="text-xs bg-white/10 px-3 py-1.5 rounded border border-white/20">
          退出
        </button>
      </div>

      <div className="flex-1 flex flex-col w-full max-w-6xl mx-auto relative">
        <div className="absolute top-2 left-0 right-0 text-center text-xs text-green-200/50 pointer-events-none z-10">
          {selectedCards.length > 0 ? '点击目标行移动' : '点击卡牌多选'}
        </div>

        {[0, 1, 2].map((rowIndex) => {
            const labels = ['头道', '中道', '尾道'];
            return (
                <div 
                  key={rowIndex}
                  onClick={() => handleRowClick(rowIndex)}
                  className={`
                    relative flex items-center justify-start pl-8 sm:pl-16
                    border-b border-dashed border-white/10
                    ${rowIndex === 0 ? 'h-[28%]' : 'h-[36%]'}
                    transition-colors
                    ${selectedCards.length > 0 ? 'hover:bg-white/5 cursor-pointer' : ''}
                  `}
                >
                  <div className="absolute left-2 sm:left-4 text-xs font-bold text-yellow-500/40 vertical-text sm:horizontal-text">
                    {labels[rowIndex]}
                  </div>

                  <div className="flex items-center h-full pt-4">
                    {rows[rowIndex].map((card, i) => (
                      <Card 
                        key={`${card.suit}-${card.rank}-${i}`} 
                        card={card} 
                        selected={isSelected(rowIndex, i)}
                        onClick={() => handleCardSelect(rowIndex, i, card)}
                        style={{ zIndex: isSelected(rowIndex, i) ? 100 : i }}
                      />
                    ))}
                    {rows[rowIndex].length === 0 && (
                        <div className="w-24 h-32 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-white/10 text-sm ml-2">
                            空
                        </div>
                    )}
                  </div>
                </div>
            );
        })}
      </div>

      <div className="bg-black/40 backdrop-blur-md p-4 flex gap-4 items-center justify-center shadow-2xl shrink-0 z-50">
        <button 
          onClick={handleSmartSort}
          disabled={isSubmitting}
          className="flex-1 max-w-[200px] bg-amber-500 text-black py-3 rounded-xl font-bold shadow-[0_4px_0_#b45309] active:shadow-none active:translate-y-1 transition-all flex flex-col items-center disabled:opacity-50"
        >
          <span className="text-base">智能理牌</span>
          <span className="text-[10px] opacity-70">{['方案 1', '方案 2', '方案 3'][solutionIndex]}</span>
        </button>
        
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`
            flex-1 max-w-[200px] text-white py-3 rounded-xl font-bold shadow-[0_4px_0_#1e40af] transition-all
            ${isSubmitting ? 'bg-gray-500 cursor-wait' : 'bg-blue-600 active:shadow-none active:translate-y-1'}
          `}
        >
          {isSubmitting ? '提交中...' : '确认出牌'}
        </button>
      </div>
    </div>
  );
};

export default GameTable;