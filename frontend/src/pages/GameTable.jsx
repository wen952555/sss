import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHand, submitHand } from '../api';
import Card from '../components/Card';

const GameTable = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState(null); // { cards, solutions, deck_id, round_info }
  
  // 牌墩状态: 3行
  const [rows, setRows] = useState([[], [], []]); // 0:头道(3), 1:中道(5), 2:尾道(5)
  
  // 智能理牌当前索引
  const [solutionIndex, setSolutionIndex] = useState(0);
  
  // 选中的牌 (用于交换): { rowIndex, cardIndex }
  const [selected, setSelected] = useState(null);

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
        // 默认使用第1个推荐方案初始化
        const defaultSol = res.data.solutions[0];
        setRows([defaultSol.front, defaultSol.mid, defaultSol.back]);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // 智能理牌切换
  const handleSmartSort = () => {
    if (!gameData || !gameData.solutions) return;
    const nextIndex = (solutionIndex + 1) % gameData.solutions.length;
    setSolutionIndex(nextIndex);
    const sol = gameData.solutions[nextIndex];
    setRows([sol.front, sol.mid, sol.back]);
  };

  // 点击牌的逻辑 (交换)
  const handleCardClick = (rIndex, cIndex) => {
    if (!selected) {
      // 选中第一张
      setSelected({ rIndex, cIndex });
    } else {
      // 如果点的是同一张，取消选中
      if (selected.rIndex === rIndex && selected.cIndex === cIndex) {
        setSelected(null);
        return;
      }
      
      // 执行交换
      const newRows = [...rows];
      const cardA = newRows[selected.rIndex][selected.cIndex];
      const cardB = newRows[rIndex][cIndex];
      
      newRows[selected.rIndex][selected.cIndex] = cardB;
      newRows[rIndex][cIndex] = cardA;
      
      setRows(newRows);
      setSelected(null);
    }
  };

  const handleSubmit = async () => {
    // 检查数量
    if (rows[0].length !== 3 || rows[1].length !== 5 || rows[2].length !== 5) {
      alert("请确保头道3张，中/尾道各5张");
      return;
    }

    try {
      await submitHand(gameData.session_id, gameData.deck_id, {
        front: rows[0],
        mid: rows[1],
        back: rows[2]
      });
      // 提交成功，直接获取下一局
      fetchGame();
    } catch (e) {
      alert("提交失败");
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">加载中...</div>;

  return (
    <div className="min-h-screen bg-green-800 p-2 flex flex-col text-white">
      {/* 顶部信息 */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm opacity-80">{gameData?.round_info}</div>
        <button onClick={() => navigate('/lobby')} className="text-xs bg-black/30 px-2 py-1 rounded">退出</button>
      </div>

      {/* 牌墩区域 (无手牌区，全在这里) */}
      <div className="flex-1 flex flex-col gap-6 justify-center">
        
        {/* 头道 */}
        <div className="flex flex-col items-center">
          <div className="mb-1 text-xs bg-black/20 px-3 rounded-full">头道 (3张)</div>
          <div className="flex gap-2">
            {rows[0].map((card, i) => (
              <Card 
                key={`${card.suit}-${card.rank}`} 
                card={card} 
                selected={selected?.rIndex === 0 && selected?.cIndex === i}
                onClick={() => handleCardClick(0, i)}
              />
            ))}
          </div>
        </div>

        {/* 中道 */}
        <div className="flex flex-col items-center">
          <div className="mb-1 text-xs bg-black/20 px-3 rounded-full">中道 (5张)</div>
          <div className="flex gap-2">
            {rows[1].map((card, i) => (
              <Card 
                key={`${card.suit}-${card.rank}`} 
                card={card} 
                selected={selected?.rIndex === 1 && selected?.cIndex === i}
                onClick={() => handleCardClick(1, i)}
              />
            ))}
          </div>
        </div>

        {/* 尾道 */}
        <div className="flex flex-col items-center">
          <div className="mb-1 text-xs bg-black/20 px-3 rounded-full">尾道 (5张)</div>
          <div className="flex gap-2">
            {rows[2].map((card, i) => (
              <Card 
                key={`${card.suit}-${card.rank}`} 
                card={card} 
                selected={selected?.rIndex === 2 && selected?.cIndex === i}
                onClick={() => handleCardClick(2, i)}
              />
            ))}
          </div>
        </div>

      </div>

      {/* 底部操作栏 */}
      <div className="bg-green-900/90 p-4 -mx-2 -mb-2 rounded-t-2xl flex gap-4">
        <button 
          onClick={handleSmartSort}
          className="flex-1 bg-yellow-500 py-3 rounded-xl font-bold shadow-lg active:bg-yellow-600 transition"
        >
          智能理牌 ({['方案一', '方案二', '方案三'][solutionIndex]})
        </button>
        <button 
          onClick={handleSubmit}
          className="flex-1 bg-blue-600 py-3 rounded-xl font-bold shadow-lg active:bg-blue-700 transition"
        >
          确认出牌
        </button>
      </div>
    </div>
  );
};

export default GameTable;