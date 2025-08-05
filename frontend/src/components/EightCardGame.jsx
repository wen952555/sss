import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './EightCardGame.css';
import { evaluateHand, compareHands, sortCards } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const EightCardGame = ({ playerHand, otherPlayers, onBackToLobby }) => {
  const LANE_LIMITS = { top: 2, middle: 3, bottom: 3 };

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
    setSelectedCards(prev => prev.some(c => areCardsEqual(c, card)) ? prev.filter(c => !areCardsEqual(c, card)) : [...prev, card]);
  };

  const handleLaneClick = (targetLaneName) => {
    if (selectedCards.length === 0) return;
    
    const removeSelected = (lane) => lane.filter(c => !selectedCards.some(s => areCardsEqual(s, c)));
    let newTop = removeSelected(topLane);
    let newMiddle = removeSelected(middleLane);
    let newBottom = removeSelected(bottomLane);

    if (targetLaneName === 'top') newTop.push(...selectedCards);
    else if (targetLaneName === 'middle') newMiddle.push(...selectedCards);
    else if (targetLaneName === 'bottom') newBottom.push(...selectedCards);

    if (newTop.length > LANE_LIMITS.top || newMiddle.length > LANE_LIMITS.middle || newBottom.length > LANE_LIMITS.bottom) {
      alert('空间不足，无法放入所选的牌！');
      return;
    }

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

  const handleConfirm = async () => {
    if (isConfirmDisabled) return;
    setIsLoading(true);
    setTimeout(() => {
      const aiHand = Object.values(otherPlayers)[0] || { top: [], middle: [], bottom: [] };
      const result = { playerHand, aiHand, score: Math.floor(Math.random() * 11) - 5 };
      setGameResult(result);
      setIsLoading(false);
    }, 1500);
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
            {Object.keys(otherPlayers).map(name => (<div key={name} className="player-status-item ready"><span className="player-name">{name}</span><span className="status-text">已准备</span></div>))}
          </div>
        </div>
        <div className="lanes-area">
          <Lane title="头道" cards={topLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} handType={topLaneHand?.name} />
          <Lane title="中道" cards={middleLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} handType={middleLaneHand?.name} />
          <Lane title="尾道" cards={bottomLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('bottom')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} handType={bottomLaneHand?.name} />
        </div>
        {isInvalid && <p className="error-message">牌型不符合规则！(尾道 ≥ 中道 ≥ 头道)</p>}
        <div className="game-actions-new">
          <button onClick={handleAutoSort} className="action-button-new auto-sort">自动理牌</button>
          <button onClick={handleConfirm} disabled={isConfirmDisabled} className="action-button-new confirm">确认牌型</button>
        </div>
      </div>
      {isLoading && <div className="loading-overlay">正在比牌...</div>}
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default EightCardGame;
