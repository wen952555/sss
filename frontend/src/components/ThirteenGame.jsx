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

const ThirteenGame = ({ playerHand, otherPlayers, onBackToLobby }) => {
  const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };

  // --- 核心修正：恢复您原始的、正确的状态初始化方式 ---
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

  // 只要所有牌分配完毕，确认按钮就可点击
  const allLanesFilled = topLane.length === LANE_LIMITS.top &&
                         middleLane.length === LANE_LIMITS.middle &&
                         bottomLane.length === LANE_LIMITS.bottom;
  const isConfirmDisabled = isLoading || !allLanesFilled;

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
    setSelectedCards(prev => prev.some(c => areCardsEqual(c, card)) ? prev.filter(c => !areCardsEqual(c, card)) : [...prev, card]);
  };

  // 移动卡牌时不限制牌数量
  const handleLaneClick = (targetLaneName) => {
    if (selectedCards.length === 0) return;
    const removeSelected = (lane) => lane.filter(c => !selectedCards.some(s => areCardsEqual(s, c)));
    let newTop = removeSelected(topLane);
    let newMiddle = removeSelected(middleLane);
    let newBottom = removeSelected(bottomLane);

    if (targetLaneName === 'top') newTop.push(...selectedCards);
    else if (targetLaneName === 'middle') newMiddle.push(...selectedCards);
    else if (targetLaneName === 'bottom') newBottom.push(...selectedCards);

    // 移动不限制数量，直到用户点确认时才校验
    setTopLane(sortCards(newTop));
    setMiddleLane(sortCards(newMiddle));
    setBottomLane(sortCards(newBottom));
    setSelectedCards([]);
  };

  const handleAutoSort = () => {
    const allCards = sortCards([...topLane, ...middleLane, ...bottomLane]);
    setTopLane(allCards.slice(0, LANE_LIMITS.top));
    setMiddleLane(allCards.slice(LANE_LIMITS.top, LANE_LIMITS.top + LANE_LIMITS.middle));
    setBottomLane(allCards.slice(LANE_LIMITS.top + LANE_LIMITS.middle));
  };

  // 点击确认牌型时校验数量和规则
  const handleConfirm = async () => {
    if (!allLanesFilled) {
      alert('请将所有牌分配到 3/5/5 的牌墩！');
      return;
    }
    // 检查规则
    const topEval = evaluateHand(topLane);
    const middleEval = evaluateHand(middleLane);
    const bottomEval = evaluateHand(bottomLane);
    const middleVsTop = compareHands(middleEval, topEval);
    const bottomVsMiddle = compareHands(bottomEval, middleEval);
    if (middleVsTop < 0 || bottomVsMiddle < 0) {
      alert('牌型不符合规则！（尾道 ≥ 中道 ≥ 头道）');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      const aiHand = Object.values(otherPlayers)[0] || { top: [], middle: [], bottom: [] };
      const result = { playerHand, aiHand, score: Math.floor(Math.random() * 21) - 10 };
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
