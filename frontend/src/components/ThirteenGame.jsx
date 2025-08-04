import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { evaluateHand, compareHands } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

const ThirteenGame = ({ playerHand, otherPlayers, onBackToLobby }) => {
  // --- 防御性初始化：即使playerHand为null或undefined，也能安全初始化 ---
  const [topLane, setTopLane] = useState(playerHand?.top || []);
  const [middleLane, setMiddleLane] = useState(playerHand?.middle || []);
  const [bottomLane, setBottomLane] = useState(playerHand?.bottom || []);
  
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedLane, setSelectedLane] = useState(null);
  const [topLaneHand, setTopLaneHand] = useState(null);
  const [middleLaneHand, setMiddleLaneHand] = useState(null);
  const [bottomLaneHand, setBottomLaneHand] = useState(null);
  const [isInvalid, setIsInvalid] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const top = evaluateHand(topLane);
    const middle = evaluateHand(middleLane);
    const bottom = evaluateHand(bottomLane);
    setTopLaneHand(top);
    setMiddleLaneHand(middle);
    setBottomLaneHand(bottom);
    if (topLane.length === 3 && middleLane.length === 5 && bottomLane.length === 5) {
      const middleVsBottom = compareHands(middle, bottom);
      const topVsMiddle = compareHands(top, middle);
      setIsInvalid(middleVsBottom > 0 || topVsMiddle > 0);
    } else {
      setIsInvalid(false);
    }
  }, [topLane, middleLane, bottomLane]);
  
  // ... (其他函数保持不变) ...
  const handleCardClick = (card, laneName) => { /* ... */ };
  const handleAutoSort = async () => { /* ... */ };
  const handleConfirm = async () => { /* ... */ };

  return (
    <div className="thirteen-game-new">
       {/* ... (其他JSX保持不变) ... */}
       <div className={`lanes-area ${isInvalid ? 'invalid' : ''}`}>
        <Lane title="头道" cards={topLane} onCardClick={(c) => handleCardClick(c, 'top')} expectedCount={3} handType={topLaneHand?.name} selected={selectedCard}/>
        <Lane title="中道" cards={middleLane} onCardClick={(c) => handleCardClick(c, 'middle')} expectedCount={5} handType={middleLaneHand?.name} selected={selectedCard}/>
        <Lane title="后道" cards={bottomLane} onCardClick={(c) => handleCardClick(c, 'bottom')} expectedCount={5} handType={bottomLaneHand?.name} selected={selectedCard}/>
      </div>
      {/* ... */}
    </div>
  );
};

export default ThirteenGame;
