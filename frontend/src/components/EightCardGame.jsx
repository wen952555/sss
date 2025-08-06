// --- START OF FILE EightCardGame.jsx ---

import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './EightCardGame.css';
import { getSmartSortedHandForEight } from '../utils/eightCardAutoSorter'; // 导入八张理牌器
import { calculateEightCardScores } from '../utils/eightCardScorer';   // 导入八张计分器
import GameResultModal from './GameResultModal';
import { sortCards } from '../utils/pokerEvaluator'; // 导入通用排序工具

const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const EightCardGame = ({ playerHand, otherPlayers, onBackToLobby, isTrial }) => {
  const LANE_LIMITS = { top: 2, middle: 3, bottom: 3 };

  // 初始发牌，不做任何排序
  const initialAllCards = [...playerHand.top, ...playerHand.middle, ...playerHand.bottom];
  
  const [topLane, setTopLane] = useState(initialAllCards.slice(0, LANE_LIMITS.top));
  const [middleLane, setMiddleLane] = useState(initialAllCards.slice(LANE_LIMITS.top, LANE_LIMITS.top + LANE_LIMITS.middle));
  const [bottomLane, setBottomLane] = useState(initialAllCards.slice(LANE_LIMITS.top + LANE_LIMITS.middle));

  const [selectedCards, setSelectedCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // 为AI玩家创建状态
  const [aiPlayerStatus, setAiPlayerStatus] = useState(
    Object.keys(otherPlayers).reduce((acc, name) => {
      acc[name] = { status: '理牌中...', sortedHand: null };
      return acc;
    }, {})
  );

  // 模拟AI逐个理牌
  useEffect(() => {
    if (!isTrial) return;

    const aiNames = Object.keys(otherPlayers);
    if (aiNames.length === 0) return;

    const processNextAi = (index) => {
      if (index >= aiNames.length) return;
      
      const aiName = aiNames[index];
      const aiUnsortedHand = otherPlayers[aiName];
      const allAiCards = [...aiUnsortedHand.top, ...aiUnsortedHand.middle, ...aiUnsortedHand.bottom];
      
      const sortedHand = getSmartSortedHandForEight(allAiCards);
      
      setAiPlayerStatus(prevStatus => ({
        ...prevStatus,
        [aiName]: { status: '已准备', sortedHand: sortedHand }
      }));
      
      // 2秒后处理下一个AI
      const timeoutId = setTimeout(() => processNextAi(index + 1), 2000);
      return () => clearTimeout(timeoutId);
    };

    const firstAiTimeout = setTimeout(() => processNextAi(0), 1000);
    return () => clearTimeout(firstAiTimeout);

  }, [isTrial, otherPlayers]);

  const handleCardClick = (card) => {
    setSelectedCards(prev =>
      prev.some(c => areCardsEqual(c, card))
        ? prev.filter(c => !areCardsEqual(c, card))
        : [...prev, card]
    );
  };

  const handleLaneClick = (targetLaneName) => {
    if (selectedCards.length === 0) return;
    const removeSelected = (lane) => lane.filter(c => !selectedCards.some(s => areCardsEqual(s, c)));

    let newTop = removeSelected(topLane);
    let newMiddle = removeSelected(middleLane);
    let newBottom = removeSelected(bottomLane);

    if (targetLaneName === 'top') newTop = [...newTop, ...selectedCards];
    if (targetLaneName === 'middle') newMiddle = [...newMiddle, ...selectedCards];
    if (targetLaneName === 'bottom') newBottom = [...newBottom, ...selectedCards];

    if (newTop.length > LANE_LIMITS.top || newMiddle.length > LANE_LIMITS.middle || newBottom.length > LANE_LIMITS.bottom) {
      alert('空间不足!');
      return;
    }

    setTopLane(sortCards(newTop));
    setMiddleLane(sortCards(newMiddle));
    setBottomLane(sortCards(newBottom));
    setSelectedCards([]);
  };

  // 玩家的自动理牌
  const handleAutoSort = () => {
    const allCards = [...topLane, ...middleLane, ...bottomLane];
    if (allCards.length !== 8) return;

    const sortedHand = getSmartSortedHandForEight(allCards);
    if (sortedHand) {
      setTopLane(sortedHand.top);
      setMiddleLane(sortedHand.middle);
      setBottomLane(sortedHand.bottom);
    } else {
      alert("智能理牌未能找到有效组合。");
    }
  };

  const handleConfirm = async () => {
    if (isLoading) return;

    const allLanesFilled = topLane.length === LANE_LIMITS.top &&
                           middleLane.length === LANE_LIMITS.middle &&
                           bottomLane.length === LANE_LIMITS.bottom;
    
    if (!allLanesFilled) {
        alert("请将所有8张牌都放入牌道！");
        return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const playerLanes = { top: topLane, middle: middleLane, bottom: bottomLane };

    if (isTrial) {
      const allAiReady = Object.values(aiPlayerStatus).every(s => s.status === '已准备');
      if (!allAiReady) {
        alert("请等待所有电脑玩家准备就绪！");
        setIsLoading(false);
        return;
      }

      setTimeout(() => {
        const playersData = [
          { name: "你", ...playerLanes },
          ...Object.entries(aiPlayerStatus).map(([name, status]) => ({
            name,
            head: status.sortedHand.top,
            middle: status.sortedHand.middle,
            tail: status.sortedHand.bottom
          }))
        ];
        
        const finalScores = calculateEightCardScores(playersData);

        const result = {
          players: playersData.map(p => ({
            name: p.name,
            hand: { top: p.head || p.top, middle: p.middle, bottom: p.tail || p.bottom }
          })),
          scores: finalScores
        };
        
        setGameResult(result);
        setIsLoading(false);
      }, 500);
    } else {
      // 在线模式逻辑 (此处应调用后端的八张比牌API)
      // ...
      setIsLoading(false);
    }
  };
  
  const handleCloseResult = () => {
    setGameResult(null);
    onBackToLobby();
  };

  return (
    <div className="eight-game-container">
      <div className="eight-game-panel">
        <div className="game-header">
          <button onClick={onBackToLobby} className="quit-button">退出游戏</button>
          <h2>急速八张</h2>
        </div>
        <div className="eight-game-players">
          <div className="player-group">
            <div className="player-status-item you"><span className="player-name">你</span><span className="status-text">理牌中...</span></div>
            {Object.entries(aiPlayerStatus).map(([name, status]) => (
              <div key={name} className={`player-status-item ${status.status === '已准备' ? 'ready' : ''}`}>
                <span className="player-name">{name}</span>
                <span className="status-text">{status.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="lanes-area">
          <Lane title="头道" cards={topLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
          <Lane title="中道" cards={middleLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
          <Lane title="尾道" cards={bottomLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('bottom')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} />
        </div>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <div className="game-actions-new">
          <button onClick={handleAutoSort} className="action-button-new auto-sort">自动理牌</button>
          <button onClick={handleConfirm} disabled={isLoading} className="action-button-new confirm">确认牌型</button>
        </div>
      </div>
      {isLoading && <div className="loading-overlay">正在比牌...</div>}
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default EightCardGame;

// --- END OF FILE EightCardGame.jsx ---