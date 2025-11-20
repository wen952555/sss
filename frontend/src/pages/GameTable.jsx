// frontend/src/pages/GameTable.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHand, submitHand } from '../api';
import Card from '../components/Card';

const GameTable = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // 新增：提交状态
  const [gameData, setGameData] = useState(null); 
  const [rows, setRows] = useState([[], [], []]); 
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [selectedCards, setSelectedCards] = useState([]);

  useEffect(() => {
    fetchGame();
  }, []);

  const fetchGame = async () => {
    try {
      // 如果不是首次加载，就不显示全屏loading，体验更好
      if (!gameData) setLoading(true);
      
      const res = await getHand();
      
      if (res.data.status === 'finished') {
        alert(res.data.message);
        navigate('/lobby');
        return;
      }
      
      if (res.data.status === 'retry') {
          // 后端要求重试（跳过坏牌局）
          setTimeout(fetchGame, 500);
          return;
      }

      if (res.data.status === 'success') {
        setGameData(res.data);
        // 初始化牌墩
        const defaultSol = res.data.solutions[0];
        setRows([defaultSol.front, defaultSol.mid, defaultSol.back]);
        setSelectedCards([]);
        setSolutionIndex(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
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
    if (isSubmitting) return; // 防止连点

    if (rows[0].length !== 3 || rows[1].length !== 5 || rows[2].length !== 5) {
      alert("牌型不合法！\n头道需 3 张，中/尾道需 5 张。");
      return;
    }
    
    setIsSubmitting(true); // 锁定按钮

    try {
      const res = await submitHand(gameData.session_id, gameData.deck_id, {
        front: rows[0], mid: rows[1], back: rows[2]
      });
      
      if (res.data.status === 'success') {
          // 提交成功，立刻获取下一局
          // 先清空数据，让界面有"刷新"的感觉
          setGameData(null); 
          await fetchGame();
      } else {
          alert("提交失败: " + (res.data.message || "未知错误"));
      }
    } catch (e) {
      alert("网络错误，请重试");
    } finally {
      setIsSubmitting(false); // 解锁
    }
  };

  if (loading || !gameData) return <div className="h-full flex items-center justify-center bg-[#1a472a] text-white font-bold text-xl">正在发牌...</div>;

  return (
    // key 属性强制 React 在 deck_id 变化时重绘整个组件，解决状态残留问题
    <div key={gameData.deck_id} className="h-full w-full bg-[#1a472a] text-white flex flex-col overflow-hidden select-none animate-fade-in">
      
      {/* 顶部 */}
      <div className="bg-black/30 p-3 flex justify-between items-center shadow-md shrink-0 z-50">
        <div>
          <h1 className="font-bold text-lg text-yellow-400 tracking-widest">十三水</h1>
          <p className="text-xs text-gray-300 opacity-80">{gameData?.round_info}</p>
        </div>
        <button onClick={() => navigate('/lobby')} className="text-xs bg-white/10 px-3 py-1.5 rounded border border-white/20">
          退出
        </button>
      </div>

      {/* 牌桌区域 */}
      <div className="flex-1 flex flex-col justify-evenly p-2 w-full max-w-6xl mx-auto relative">
        
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

      {/* 底部按钮 */}
      <div className="bg-black/40 backdrop-blur-md p-4 flex gap-4 items-center justify-center shadow-2xl shrink-0 z-50">
        <button 
          onClick={handleSmartSort}
          disabled={isSubmitting}
          className="flex-1 max-w-[200px] bg-amber-500 text-black py-3 rounded-xl font-bold shadow-[0_4px_0_#b45309] active:shadow-none active:translate-y-1 transition-all flex flex-col items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-base">智能理牌</span>
          <span className="text-[10px] opacity-70">{['方案 1', '方案 2', '方案 3'][solutionIndex]}</span>
        </button>
        
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`
            flex-1 max-w-[200px] text-white py-3 rounded-xl font-bold shadow-[0_4px_0_#1e40af] transition-all
            ${isSubmitting 
               ? 'bg-gray-500 cursor-wait shadow-none translate-y-1' 
               : 'bg-blue-600 active:shadow-none active:translate-y-1'
            }
          `}
        >
          {isSubmitting ? '提交中...' : '确认出牌'}
        </button>
      </div>
    </div>
  );
};

export default GameTable;
