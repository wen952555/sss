// --- START OF FILE ThirteenGame.jsx ---

import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { getSmartSortedHand } from '../utils/autoSorter';
import { calcSSSAllScores } from '../utils/sssScorer';
import { sortCards } from '../utils/pokerEvaluator'; 
import GameResultModal from './GameResultModal';

const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const convertCardsToStingFormat = (cards) => {
  if (!cards || cards.length === 0) return [];
  return cards.map(card => `${card.rank}_of_${card.suit}`);
};

const ThirteenGame = ({ playerHand, otherPlayers, onBackToLobby, isTrial }) => {
  const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };
  
  const initialAllCards = playerHand.top.concat(playerHand.middle, playerHand.bottom);
  
  const [topLane, setTopLane] = useState(initialAllCards.slice(0, 3));
  const [middleLane, setMiddleLane] = useState(initialAllCards.slice(3, 8));
  const [bottomLane, setBottomLane] = useState(initialAllCards.slice(8, 13));

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

    if (targetLaneName === 'top') newTop = sortCards([...newTop, ...selectedCards]);
    if (targetLaneName === 'middle') newMiddle = sortCards([...newMiddle, ...selectedCards]);
    if (targetLaneName === 'bottom') newBottom = sortCards([...newBottom, ...selectedCards]);

    // 移除容量检查
    // if (newTop.length > LANE_LIMITS.top || ...) {
    //   alert('空间不足!');
    //   return;
    // }

    setTopLane(newTop);
    setMiddleLane(newMiddle);
    setBottomLane(newBottom);
    setSelectedCards([]);
  };

  const handleAutoSort = () => {
    const allCards = [...topLane, ...middleLane, ...bottomLane];
    if (allCards.length !== 13) return;
    const sortedHand = getSmartSortedHand(allCards);
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
    <div className="table-root">
      {/* ... */}
    </div>
  );
};

export default ThirteenGame;

// --- END OF FILE ThirteenGame.jsx ---