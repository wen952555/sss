// --- START OF FILE ThirteenGame.jsx ---

import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { evaluateHand, compareHands, sortCards } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

// --- ↓↓↓ 新增的智能理牌辅助函数 ↓↓↓ ---

/**
 * 辅助函数：从一个数组中获取所有指定大小的组合
 * @param {Array} array - 原始数组 (例如：所有卡牌)
 * @param {number} size - 组合的大小 (例如：5张牌)
 * @returns {Array<Array>} 所有可能的组合
 */
const getCombinations = (array, size) => {
  if (size === 0) return [[]];
  if (!array || array.length < size) return [];

  const first = array[0];
  const rest = array.slice(1);

  const combsWithFirst = getCombinations(rest, size - 1).map(comb => [first, ...comb]);
  const combsWithoutFirst = getCombinations(rest, size);

  return [...combsWithFirst, ...combsWithoutFirst];
};

/**
 * 辅助函数：在一组牌中找到能组成的最佳牌型
 * @param {Array} cards - 卡牌数组
 * @param {number} handSize - 需要几张牌组成一手 (例如 3 或 5)
 * @returns {{hand: Object, combination: Array}|null} 返回最佳牌型评估结果和对应的卡牌组合
 */
const findBestHand = (cards, handSize) => {
  const allCombinations = getCombinations(cards, handSize);
  if (allCombinations.length === 0) return null;

  let bestHand = null;
  let bestCombination = [];

  for (const combination of allCombinations) {
    const currentHand = evaluateHand(combination);
    if (!bestHand || compareHands(currentHand, bestHand) > 0) {
      bestHand = currentHand;
      bestCombination = combination;
    }
  }

  return { hand: bestHand, combination: bestCombination };
};

// --- ↑↑↑ 新增辅助函数结束 ↑↑↑ ---


const ThirteenGame = ({ playerHand, otherPlayers, onBackToLobby }) => {
  const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };

  const [topLane, setTopLane] = useState(playerHand?.top || []);
  const [middleLane, setMiddleLane] = useState(playerHand?.middle || []);
  const [bottomLane, setBottomLane] = useState(playerHand?.bottom || []);

  const [selectedCards, setSelectedCards] = useState([]);
  const [topLaneHand, setTopLaneHand] = useState(null);
  const [middleLaneHand, setMiddleLaneHand] = useState(null);
  const [bottomLaneHand, setBottomLaneHand] = useState(null);
  const [isInvalid, setIsInvalid] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const allLanesFilled = topLane.length === LANE_LIMITS.top &&
                         middleLane.length === LANE_LIMITS.middle &&
                         bottomLane.length === LANE_LIMITS.bottom;
  const isConfirmDisabled = isLoading || !allLanesFilled || isInvalid;

  useEffect(() => {
    if (allLanesFilled) {
      const topEval = evaluateHand(topLane);
      const middleEval = evaluateHand(middleLane);
      const bottomEval = evaluateHand(bottomLane);
      setTopLaneHand(topEval);
      setMiddleLaneHand(middleEval);
      setBottomLaneHand(bottomEval);
      const middleVsTop = compareHands(middleEval, topEval);
      const bottomVsMiddle = compareHands(bottomEval, middleEval);
      setIsInvalid(middleVsTop < 0 || bottomVsMiddle < 0);
    } else {
      setIsInvalid(false);
      setTopLaneHand(null);
      setMiddleLaneHand(null);
      setBottomLaneHand(null);
    }
  }, [topLane, middleLane, bottomLane, allLanesFilled]);

  const handleCardClick = (card) => {
    setSelectedCards(prev =>
      prev.some(c => areCardsEqual(c, card))
        ? prev.filter(c => !areCardsEqual(c, card))
        : [...prev, card]
    );
  };

  const handleLaneClick = (targetLaneName) => {
    if (selectedCards.length === 0) return;
    const removeSelected = (lane) =>
      lane.filter(c => !selectedCards.some(s => areCardsEqual(s, c)));

    let newTop = removeSelected(topLane);
    let newMiddle = removeSelected(middleLane);
    let newBottom = removeSelected(bottomLane);

    if (targetLaneName === 'top') newTop = sortCards([...newTop, ...selectedCards]);
    if (targetLaneName === 'middle') newMiddle = sortCards([...newMiddle, ...selectedCards]);
    if (targetLaneName === 'bottom') newBottom = sortCards([...newBottom, ...selectedCards]);

    if (newTop.length > LANE_LIMITS.top ||
      newMiddle.length > LANE_LIMITS.middle ||
      newBottom.length > LANE_LIMITS.bottom) {
      alert('空间不足，无法放入所选的牌！');
      return;
    }

    setTopLane(newTop);
    setMiddleLane(newMiddle);
    setBottomLane(newBottom);
    setSelectedCards([]);
  };

  // --- ↓↓↓ 全新的、智能的自动理牌函数 ↓↓↓ ---
  const handleAutoSort = () => {
    const allCards = [...topLane, ...middleLane, ...bottomLane];
    if (allCards.length !== 13) return; // 仅为13张时执行

    // 1. 找出最佳的尾道
    const bottomResult = findBestHand(allCards, 5);
    if (!bottomResult) return; // 无法组成5张牌

    const newBottomLane = bottomResult.combination;
    const remainingCardsAfterBottom = allCards.filter(c => !newBottomLane.includes(c));

    // 2. 从剩下的牌中找出最佳的中道
    const middleResult = findBestHand(remainingCardsAfterBottom, 5);
    if (!middleResult) return; // 无法组成5张牌

    // 3. 检查中道和尾道的合法性 (尾道必须大于等于中道)
    if (compareHands(bottomResult.hand, middleResult.hand) < 0) {
      // 这是一个简化处理：如果最优组合不合法，就退回旧的简单排序法。
      // 一个更完美的算法会在这里回溯，尝试次优组合。
      const sortedCards = sortCards(allCards);
      setTopLane(sortedCards.slice(0, 3));
      setMiddleLane(sortedCards.slice(3, 8));
      setBottomLane(sortedCards.slice(8, 13));
      alert("智能理牌未能找到必胜组合，已为您进行基础排序。");
      return;
    }
    
    const newMiddleLane = middleResult.combination;
    const newTopLane = remainingCardsAfterBottom.filter(c => !newMiddleLane.includes(c));
    
    // 4. 设置所有牌道
    setBottomLane(sortCards(newBottomLane));
    setMiddleLane(sortCards(newMiddleLane));
    setTopLane(sortCards(newTopLane));
  };
  // --- ↑↑↑ 智能理牌函数结束 ↑↑↑ ---


  const handleConfirm = async () => {
    if (isConfirmDisabled) return;
    setIsLoading(true);
    // 待办事项：这里应该调用API将牌型发送到后端
    setTimeout(() => {
      // 修复了之前指出的 GameResultModal 数据结构不匹配的BUG
      const playerHandData = { top: topLane, middle: middleLane, bottom: bottomLane };
      const aiPlayersData = Object.entries(otherPlayers).map(([name, hand]) => ({ name, hand }));
      
      const result = {
        players: [
          { name: "你", hand: playerHandData },
          ...aiPlayersData
        ],
        // 模拟得分，实际应由后端计算
        scores: [Math.floor(Math.random() * 21) - 10, ...aiPlayersData.map(() => Math.floor(Math.random() * 21) - 10)]
      };

      setGameResult(result);
      setIsLoading(false);
    }, 1500);
  };

  const handleCloseResult = () => {
    setGameResult(null);
    onBackToLobby();
  };

  return (
    <div className="table-root">
      <div className="table-panel">
        <div className="table-top-bar">
          <button onClick={onBackToLobby} className="table-quit-btn">退出游戏</button>
          <div className="table-score-box">积分: 1000</div>
        </div>
        <div className="players-status-bar">
          <div className="player-status-item you"><span className="player-name">你</span><span className="status-text">理牌中...</span></div>
          {Object.keys(otherPlayers).map(name => (<div key={name} className="player-status-item ready"><span className="player-name">{name}</span><span className="status-text">已准备</span></div>))}
        </div>
        <div className="table-lanes-area">
          <Lane title="头道" cards={topLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} handType={topLaneHand?.name} />
          <Lane title="中道" cards={middleLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} handType={middleLaneHand?.name} />
          <Lane title="尾道" cards={bottomLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('bottom')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} handType={bottomLaneHand?.name} />
        </div>
        {isInvalid && <p className="error-message">牌型不符合规则！(尾道 ≥ 中道 ≥ 头道)</p>}
        <div className="table-actions-bar">
          <button onClick={handleAutoSort} className="action-btn orange">自动理牌</button>
          <button onClick={handleConfirm} disabled={isConfirmDisabled} className="action-btn green">确认牌型</button>
        </div>
        {isLoading && <div className="loading-overlay">正在比牌...</div>}
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default ThirteenGame;
// --- END OF FILE ThirteenGame.jsx ---