import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css'; // 复用十三张的样式
import { evaluateHand, compareHands } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

const EightCardGame = ({ playerHand, otherPlayers, onBackToLobby }) => {
  // --- 防御性初始化 ---
  const [topLane, setTopLane] = useState(playerHand?.top || []);
  const [middleLane, setMiddleLane] = useState(playerHand?.middle || []);
  const [bottomLane, setBottomLane] = useState(playerHand?.bottom || []);
  
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedLane, setSelectedLane] = useState(null);
  
  // --- BUG修复：补上所有缺失的状态变量 ---
  const [topLaneHand, setTopLaneHand] = useState(null);
  const [middleLaneHand, setMiddleLaneHand] = useState(null);
  const [bottomLaneHand, setBottomLaneHand] = useState(null);
  const [isInvalid, setIsInvalid] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const LANE_LIMITS = { top: 2, middle: 3, bottom: 3 };

  useEffect(() => {
    const top = evaluateHand(topLane);
    const middle = evaluateHand(middleLane);
    const bottom = evaluateHand(bottomLane);
    setTopLaneHand(top);
    setMiddleLaneHand(middle);
    setBottomLaneHand(bottom);

    if (topLane.length === LANE_LIMITS.top && middleLane.length === LANE_LIMITS.middle && bottomLane.length === LANE_LIMITS.bottom) {
      const middleVsBottom = compareHands(middle, bottom);
      const topVsMiddle = compareHands(top, middle);
      setIsInvalid(middleVsBottom > 0 || topVsMiddle > 0);
    } else {
      setIsInvalid(false);
    }
  }, [topLane, middleLane, bottomLane]);
  
  // ... (其他函数保持不变) ...
  const handleCardClick = (card, laneName) => { /* ... */ };
  const handleLaneClick = (laneName) => { /* ... */ };
  const handleAutoSort = async () => { /* ... */ };
  const handleConfirm = async () => { /* ... */ };

  return (
    <div className="thirteen-game-new">
      {/* ... (其他JSX保持不变) ... */}
      <div className={`lanes-area ${isInvalid ? 'invalid' : ''}`}>
        <Lane title="头道" cards={topLane} onCardClick={(c) => handleCardClick(c, 'top')} onLaneClick={() => handleLaneClick('top')} expectedCount={LANE_LIMITS.top} handType={topLaneHand?.name} selected={selectedCard}/>
        <Lane title="中道" cards={middleLane} onCardClick={(c) => handleCardClick(c, 'middle')} onLaneClick={() => handleLaneClick('middle')} expectedCount={LANE_LIMITS.middle} handType={middleLaneHand?.name} selected={selectedCard}/>
        <Lane title="尾道" cards={bottomLane} onCardClick={(c) => handleCardClick(c, 'bottom')} onLaneClick={() => handleLaneClick('bottom')} expectedCount={LANE_LIMITS.bottom} handType={bottomLaneHand?.name} selected={selectedCard}/>
      </div>
      {isInvalid && <div className="error-message">无效牌型！</div>}
      {/* ... */}
    </div>
  );
};

export default EightCardGame;
