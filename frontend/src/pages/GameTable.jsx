import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHand, submitHand } from '../api';
import Card from '../components/Card';

const GameTable = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState(null); 
  
  // 牌墩数据: 0:头道, 1:中道, 2:尾道, 3:待分配区(备用，虽然我们直接发到了墩里)
  const [rows, setRows] = useState([[], [], []]); 
  
  // 智能理牌当前方案索引
  const [solutionIndex, setSolutionIndex] = useState(0);
  
  // 多选状态: 存储被选中的牌的唯一标识 (这里用 suit+rank 组合键，或者用对象引用)
  // 格式: [{ rIndex: 0, cIndex: 1, card: {...} }, ...]
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
        setSelectedCards([]); // 清空选中
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // 切换智能理牌
  const handleSmartSort = () => {
    if (!gameData || !gameData.solutions) return;
    const nextIndex = (solutionIndex + 1) % gameData.solutions.length;
    setSolutionIndex(nextIndex);
    const sol = gameData.solutions[nextIndex];
    setRows([sol.front, sol.mid, sol.back]);
    setSelectedCards([]); // 切换方案时清空选中
  };

  // 处理点击卡牌 (多选/反选)
  const handleCardSelect = (rIndex, cIndex, card) => {
    const existingIdx = selectedCards.findIndex(
      item => item.rIndex === rIndex && item.cIndex === cIndex
    );

    if (existingIdx >= 0) {
      // 已存在 -> 取消选中
      const newSel = [...selectedCards];
      newSel.splice(existingIdx, 1);
      setSelectedCards(newSel);
    } else {
      // 不存在 -> 加入选中
      setSelectedCards([...selectedCards, { rIndex, cIndex, card }]);
    }
  };

  // 判断某张牌是否被选中
  const isSelected = (rIndex, cIndex) => {
    return selectedCards.some(item => item.rIndex === rIndex && item.cIndex === cIndex);
  };

  // 处理点击牌墩 (移动逻辑)
  const handleRowClick = (targetRowIndex) => {
    if (selectedCards.length === 0) return; // 没选牌，点牌墩没反应

    // 1. 计算目标行还能放多少张
    const limits = [3, 5, 5];
    const currentCount = rows[targetRowIndex].length;
    const maxCount = limits[targetRowIndex];
    
    // 如果要移动的牌数量 + 已有数量 > 限制 (可选：你可以选择不限制，让用户随便放，提交时再报错。这里为了体验，暂不强制阻拦，或者只做红框提示)
    // 你的需求是"不限制牌墩扑克牌数量，提交牌型才检查"，所以这里我们**不做拦截**，直接移动。

    // 2. 执行移动
    const newRows = [...rows]; // 复制一份

    // 先从原来的位置把牌拿走
    // 技巧：先收集所有要移动的牌对象，再重新构建每一行
    const cardsToMove = selectedCards.map(s => s.card);
    
    // 遍历每一行，过滤掉被选中的牌
    for (let i = 0; i < 3; i++) {
      newRows[i] = newRows[i].filter(card => {
        // 如果这张牌在 cardsToMove 里，就过滤掉
        const isMoving = cardsToMove.some(c => c.suit === card.suit && c.rank === card.rank);
        return !isMoving;
      });
    }

    // 把牌加到目标行
    newRows[targetRowIndex] = [...newRows[targetRowIndex], ...cardsToMove];

    // 3. 更新状态
    setRows(newRows);
    setSelectedCards([]); // 移动后清空选中
  };

  // 提交
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

  if (loading) return <div className="flex h-screen items-center justify-center bg-green-900 text-white">正在发牌...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-950 text-white flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-black/20 backdrop-blur-sm p-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="font-bold text-lg tracking-wider text-yellow-400">十三水</h1>
          <p className="text-xs text-gray-300">{gameData?.round_info}</p>
        </div>
        <button onClick={() => navigate('/lobby')} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded border border-white/20">
          返回大厅
        </button>
      </div>

      {/* 游戏区域 */}
      <div className="flex-1 flex flex-col p-2 max-w-3xl mx-auto w-full gap-0">
        
        {/* 提示语 */}
        <div className="text-center text-sm text-green-200/70 mb-2">
          {selectedCards.length > 0 
            ? `已选中 ${selectedCards.length} 张，点击下方任意牌墩区域即可移动` 
            : '点击扑克牌进行多选'}
        </div>

        {/* --- 头道 (3张) --- */}
        <div 
          onClick={() => handleRowClick(0)}
          className={`
            flex-1 min-h-[120px] border-b-2 border-dashed border-white/20 relative
            flex flex-col justify-center items-center transition-colors
            ${selectedCards.length > 0 ? 'hover:bg-white/10 cursor-pointer' : ''}
          `}
        >
          <div className="absolute left-2 top-2 text-xs font-bold text-yellow-500/80 bg-black/30 px-2 rounded">头道</div>
          <div className="flex gap-2 sm:gap-4 flex-wrap justify-center p-2">
            {rows[0].map((card, i) => (
              <Card 
                key={`${card.suit}-${card.rank}`} 
                card={card} 
                selected={isSelected(0, i)}
                onClick={() => handleCardSelect(0, i, card)}
              />
            ))}
            {/* 占位符: 如果没有牌，显示一个虚线框提示 */}
            {rows[0].length === 0 && <div className="text-white/20 text-sm">点击此处移动牌</div>}
          </div>
        </div>

        {/* --- 中道 (5张) --- */}
        <div 
          onClick={() => handleRowClick(1)}
          className={`
            flex-1 min-h-[120px] border-b-2 border-dashed border-white/20 relative
            flex flex-col justify-center items-center transition-colors
            ${selectedCards.length > 0 ? 'hover:bg-white/10 cursor-pointer' : ''}
          `}
        >
          <div className="absolute left-2 top-2 text-xs font-bold text-yellow-500/80 bg-black/30 px-2 rounded">中道</div>
          <div className="flex gap-1 sm:gap-3 flex-wrap justify-center p-2">
            {rows[1].map((card, i) => (
              <Card 
                key={`${card.suit}-${card.rank}`} 
                card={card} 
                selected={isSelected(1, i)}
                onClick={() => handleCardSelect(1, i, card)}
              />
            ))}
             {rows[1].length === 0 && <div className="text-white/20 text-sm">点击此处移动牌</div>}
          </div>
        </div>

        {/* --- 尾道 (5张) --- */}
        <div 
          onClick={() => handleRowClick(2)}
          className={`
            flex-1 min-h-[120px] relative
            flex flex-col justify-center items-center transition-colors
            ${selectedCards.length > 0 ? 'hover:bg-white/10 cursor-pointer' : ''}
          `}
        >
          <div className="absolute left-2 top-2 text-xs font-bold text-yellow-500/80 bg-black/30 px-2 rounded">尾道</div>
          <div className="flex gap-1 sm:gap-3 flex-wrap justify-center p-2">
            {rows[2].map((card, i) => (
              <Card 
                key={`${card.suit}-${card.rank}`} 
                card={card} 
                selected={isSelected(2, i)}
                onClick={() => handleCardSelect(2, i, card)}
              />
            ))}
             {rows[2].length === 0 && <div className="text-white/20 text-sm">点击此处移动牌</div>}
          </div>
        </div>

      </div>

      {/* 底部按钮栏 */}
      <div className="bg-black/40 backdrop-blur-md p-4 flex gap-4 items-center justify-center shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <button 
          onClick={handleSmartSort}
          className="flex-1 max-w-[200px] bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex flex-col items-center leading-tight"
        >
          <span className="text-sm">智能理牌</span>
          <span className="text-xs font-normal opacity-80">{['方案一', '方案二', '方案三'][solutionIndex]}</span>
        </button>
        
        <button 
          onClick={handleSubmit}
          className="flex-1 max-w-[200px] bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
        >
          确认出牌
        </button>
      </div>
    </div>
  );
};

export default GameTable;