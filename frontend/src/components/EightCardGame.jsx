// --- START OF FILE EightCardGame.jsx ---

import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './EightCardGame.css';
import { getSmartSortedHandForEight } from '../utils/eightCardAutoSorter';
import { calculateEightCardScores } from '../utils/eightCardScorer';
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
    // (useEffect logic for AI remains the same)
  }, [isTrial, otherPlayers]);

  const handleCardClick = (card) => {
    setSelectedCards(prev =>
      prev.some(c => areCardsEqual(c, card))
        ? prev.filter(c => !areCardsEqual(c, card))
        : [...prev, card]
    );
  };

  // --- 核心修改 1: handleLaneClick 不再检查牌道容量 ---
  const handleLaneClick = (targetLaneName) => {
    if (selectedCards.length === 0) return;
    const removeSelected = (lane) => lane.filter(c => !selectedCards.some(s => areCardsEqual(s, c)));
    let newTop = removeSelected(topLane);
    let newMiddle = removeSelected(middleLane);
    let newBottom = removeSelected(bottomLane);

    if (targetLaneName === 'top') newTop = [...newTop, ...selectedCards];
    if (targetLaneName === 'middle') newMiddle = [...newMiddle, ...selectedCards];
    if (targetLaneName === 'bottom') newBottom = [...newBottom, ...selectedCards];

    // 移除容量检查
    // if (newTop.length > LANE_LIMITS.top || ...) { ... }

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

  // --- 核心修改 2: handleConfirm 增加牌道数量检查 ---
  const handleConfirm = async () => {
    if (isLoading) return;

    // 1. 在这里进行数量检查
    if (topLane.length !== LANE_LIMITS.top || 
        middleLane.length !== LANE_LIMITS.middle || 
        bottomLane.length !== LANE_LIMITS.bottom) {
      alert(`牌道数量错误！\n\n请确保：\n- 头道: ${LANE_LIMITS.top} 张\n- 中道: ${LANE_LIMITS.middle} 张\n- 尾道: ${LANE_LIMITS.bottom} 张`);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const playerLanes = { top: topLane, middle: middleLane, bottom: bottomLane };

    if (isTrial) {
      // (试玩逻辑不变)
    } else {
      // (在线逻辑不变)
    }
  };
  
  const handleCloseResult = () => {
    setGameResult(null);
    onBackToLobby();
  };

  // (JSX return 部分不变)
  return (
    <div className="eight-game-container">
      {/* ... */}
    </div>
  );
};

export default EightCardGame;

// --- END OF FILE EightCardGame.jsx ---