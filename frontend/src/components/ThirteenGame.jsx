// --- START OF FILE ThirteenGame.jsx ---

import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
// 导入新的智能理牌模块
import { getSmartSortedHand } from '../utils/autoSorter';
// 导入新的计分器
import { calcSSSAllScores } from '../utils/sssScorer';
// 只导入基础工具
import { sortCards } from '../utils/pokerEvaluator'; 

const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const convertCardsToStingFormat = (cards) => {
  // ... (此函数不变，省略)
};


const ThirteenGame = ({ playerHand, otherPlayers, onBackToLobby, isTrial }) => {
  // (useState and other hooks 保持不变, 省略)
  const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };
  const initialAllCards = playerHand.top.concat(playerHand.middle, playerHand.bottom);
  const [topLane, setTopLane] = useState(initialAllCards.slice(0, 3));
  const [middleLane, setMiddleLane] = useState(initialAllCards.slice(3, 8));
  const [bottomLane, setBottomLane] = useState(initialAllCards.slice(8, 13));
  // ... 其他状态

  // (handleCardClick, handleLaneClick 等交互函数不变, 省略)
  // ...

  // --- 核心修改：handleAutoSort 现在只调用新模块 ---
  const handleAutoSort = () => {
    const allCards = [...topLane, ...middleLane, ...bottomLane];
    if (allCards.length !== 13) return;

    // 调用独立的理牌模块
    const sortedHand = getSmartSortedHand(allCards);

    if (sortedHand) {
      // 如果找到了解，就更新UI
      setTopLane(sortedHand.top);
      setMiddleLane(sortedHand.middle);
      setBottomLane(sortedHand.bottom);
    } else {
      // 如果没找到解，可以给用户一个提示，并执行最基础的排序
      alert("智能理牌未能找到最佳组合，已为您进行基础大小排序。");
      const basicSorted = sortCards(allCards);
      setTopLane(basicSorted.slice(8, 13).reverse().slice(0,3)); // 只是一个例子
      setMiddleLane(basicSorted.slice(3, 8).reverse());
      setBottomLane(basicSorted.slice(0, 5).reverse());
    }
  };

  const handleConfirm = async () => {
    // (此函数完全不变，因为它已经使用了新的计分器，不受理牌模块影响)
    // ...
  };
  
  const handleCloseResult = () => {
    // (此函数不变)
    // ...
  };
  
  // (JSX return 部分的结构不变, 省略)
  return (
    <div className="table-root">
      {/* ... */}
      <div className="table-actions-bar">
          <button onClick={handleAutoSort} className="action-btn orange">自动理牌</button>
          <button onClick={handleConfirm} className="action-btn green">确认牌型</button>
      </div>
      {/* ... */}
    </div>
  );
};

export default ThirteenGame;

// --- END OF FILE ThirteenGame.jsx ---