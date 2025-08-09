// --- START OF FILE frontend/src/components/EightCardGame.jsx (MODIFIED) ---

import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
// --- 核心修改 1: 引入统一的CSS文件 (尽管文件名没变，但内容已统一) ---
import './EightCardGame.css'; 
import { getSmartSortedHandForEight } from '../utils/eightCardAutoSorter';
import { calculateSinglePairScoreForEight } from '../utils/eightCardScorer';
import GameResultModal from './GameResultModal';
import { sortCards } from '../utils/pokerEvaluator';

const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const EightCardGame = ({ playerHand, otherPlayers, onBackToLobby, isTrial }) => {
  const LANE_LIMITS = { top: 2, middle: 3, bottom: 3 };

  const initialAllCards = [...playerHand.top, ...playerHand.middle, ...playerHand.bottom];
  
  const [topLane, setTopLane] = useState(initialAllCards.slice(0, LANE_LIMITS.top));
  const [middleLane, setMiddleLane] = useState(initialAllCards.slice(LANE_LIMITS.top, LANE_LIMITS.top + LANE_LIMITS.middle));
  const [bottomLane, setBottomLane] = useState(initialAllCards.slice(LANE_LIMITS.top + LANE_LIMITS.middle));

  const [selectedCards, setSelectedCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [aiPlayerStatus, setAiPlayerStatus] = useState(
    Object.keys(otherPlayers).reduce((acc, name) => {
      acc[name] = { status: '理牌中...', sortedHand: null };
      return acc;
    }, {})
  );

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

    setTopLane(sortCards(newTop));
    setMiddleLane(sortCards(newMiddle));
    setBottomLane(sortCards(newBottom));
    setSelectedCards([]);
  };

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
    
    if (topLane.length !== LANE_LIMITS.top || middleLane.length !== LANE_LIMITS.middle || bottomLane.length !== LANE_LIMITS.bottom) {
      alert(`牌道数量错误！\n\n请确保：\n- 头道: ${LANE_LIMITS.top} 张\n- 中道: ${LANE_LIMITS.middle} 张\n- 尾道: ${LANE_LIMITS.bottom} 张`);
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
        const playerYouData = { name: "你", head: playerLanes.top, middle: playerLanes.middle, tail: playerLanes.bottom };
        const aiPlayersData = Object.entries(aiPlayerStatus).map(([name, status]) => ({
            name,
            head: status.sortedHand.top,
            middle: status.sortedHand.middle,
            tail: status.sortedHand.bottom,
        }));

        const pairScores = aiPlayersData.map(ai => calculateSinglePairScoreForEight(playerYouData, ai));
        const myTotalScore = pairScores.reduce((sum, score) => sum + score, 0);

        const result = {
            players: [
                { name: "你", hand: playerLanes },
                ...aiPlayersData.map(p => ({
                    name: p.name,
                    hand: { top: p.head, middle: p.middle, bottom: p.tail }
                }))
            ],
            scores: [myTotalScore, ...pairScores]
        };
        
        setGameResult(result);
        setIsLoading(false);
      }, 500);
    } else {
      // 在线模式逻辑
    }
  };
  
  const handleCloseResult = () => {
    setGameResult(null);
    onBackToLobby();
  };

  // --- 核心修改 2: 使用与ThirteenGame完全相同的JSX结构和className ---
  return (
    <div className="table-root">
      <div className="table-panel">
        <div className="table-top-bar">
          <button onClick={onBackToLobby} className="table-quit-btn">退出游戏</button>
          <div className="table-score-box">{isTrial ? "试玩模式" : "急速八张"}</div>
        </div>
        <div className="players-status-bar">
          <div className="player-status-item you"><span className="player-name">你</span><span className="status-text">理牌中...</span></div>
          {Object.entries(aiPlayerStatus).map(([name, status]) => (
            <div key={name} className={`player-status-item ${status.status === '已准备' ? 'ready' : ''}`}>
              <span className="player-name">{name}</span>
              <span className="status-text">{status.status}</span>
            </div>
          ))}
        </div>
        <div className="table-lanes-area">
          <Lane title="头道" cards={topLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
          <Lane title="中道" cards={middleLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
          <Lane title="尾道" cards={bottomLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('bottom')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} />
        </div>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <div className="table-actions-bar">
          <button onClick={handleAutoSort} className="action-btn orange">自动理牌</button>
          <button onClick={handleConfirm} disabled={isLoading} className="action-btn green">确认牌型</button>
        </div>
        {isLoading && <div className="loading-overlay">正在比牌...</div>}
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default EightCardGame;

// --- END OF FILE frontend/src/components/EightCardGame.jsx (MODIFIED) ---