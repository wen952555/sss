import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css'; // 复用十三张的样式
import { evaluateHand, compareHands } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

const EightCardGame = ({ playerHand, onBackToLobby }) => {
  // 初始牌墩状态
  const [topLane, setTopLane] = useState(playerHand.top || []);
  const [middleLane, setMiddleLane] = useState(playerHand.middle || []);
  const [bottomLane, setBottomLane] = useState(playerHand.bottom || []);

  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedLane, setSelectedLane] = useState(null);
  
  const [isInvalid, setIsInvalid] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [isLoading, setIsLoading] =useState(false);

  // 牌墩数量限制
  const LANE_LIMITS = { top: 2, middle: 3, bottom: 3 };

  // 评估手牌牌力
  useEffect(() => {
    const top = evaluateHand(topLane);
    const middle = evaluateHand(middleLane);
    const bottom = evaluateHand(bottomLane);

    if (topLane.length === LANE_LIMITS.top && middleLane.length === LANE_LIMITS.middle && bottomLane.length === LANE_LIMITS.bottom) {
      const middleVsBottom = compareHands(middle, bottom);
      const topVsMiddle = compareHands(top, middle);
      setIsInvalid(middleVsBottom > 0 || topVsMiddle > 0);
    } else {
      setIsInvalid(false);
    }
  }, [topLane, middleLane, bottomLane]);
  
  const resetGame = () => { onBackToLobby(); };

  // 卡牌交换逻辑
  const handleCardClick = (card, laneName) => {
    if (!selectedCard) {
      setSelectedCard(card);
      setSelectedLane(laneName);
    } else {
      const lanes = { top: [...topLane], middle: [...middleLane], bottom: [...bottomLane] };
      const setters = { top: setTopLane, middle: setMiddleLane, bottom: setBottomLane };

      if (lanes[laneName].length >= LANE_LIMITS[laneName] && selectedLane !== laneName) {
        // 如果目标牌墩已满，且不是在同一个牌墩内操作，则执行交换
        const fromLane = lanes[selectedLane].filter(c => !(c.rank === selectedCard.rank && c.suit === selectedCard.suit));
        const toLane = lanes[laneName].filter(c => !(c.rank === card.rank && c.suit === card.suit));
        fromLane.push(card);
        toLane.push(selectedCard);
        setters[selectedLane](fromLane);
        setters[laneName](toLane);
      } else {
        // 移动（非交换）
        const fromLane = lanes[selectedLane].filter(c => !(c.rank === selectedCard.rank && c.suit === selectedCard.suit));
        const toLane = [...lanes[laneName], selectedCard];
        if (toLane.length <= LANE_LIMITS[laneName]) {
             setters[selectedLane](fromLane);
             setters[laneName](toLane);
        } else {
            alert("目标牌墩已满!");
        }
      }
      setSelectedCard(null);
      setSelectedLane(null);
    }
  };

  const handleLaneClick = (laneName) => {
    if(selectedCard && selectedLane) {
        const lanes = { top: [...topLane], middle: [...middleLane], bottom: [...bottomLane] };
        const setters = { top: setTopLane, middle: setMiddleLane, bottom: setBottomLane };
        const fromLane = lanes[selectedLane].filter(c => !(c.rank === selectedCard.rank && c.suit === selectedCard.suit));
        const toLane = [...lanes[laneName], selectedCard];

        if (toLane.length <= LANE_LIMITS[laneName]) {
            setters[selectedLane](fromLane);
            setters[laneName](toLane);
            setSelectedCard(null);
            setSelectedLane(null);
        } else {
            alert("目标牌墩已满!");
        }
    }
  }

  const handleConfirm = async () => {
    // 检查牌墩数量是否正确
    if (topLane.length !== LANE_LIMITS.top || middleLane.length !== LANE_LIMITS.middle || bottomLane.length !== LANE_LIMITS.bottom) {
        return alert("请将所有牌按2-3-3的数量摆好！");
    }
    if (isInvalid) return alert("牌型不合法（倒水）！");
    // 后续的比牌逻辑可以复用十三张的
  };

  return (
    <div className="thirteen-game-new">
      <div className="game-header">
        <button onClick={onBackToLobby} className="quit-button">退出游戏</button>
      </div>
      <div className="player-status-area">
        {/* 在八张中可以只显示自己的状态，或显示所有6个玩家 */}
        <div className="player-box self">你</div>
      </div>
      <div className={`lanes-area ${isInvalid ? 'invalid' : ''}`}>
        <Lane title="头道" cards={topLane} onCardClick={(c) => handleCardClick(c, 'top')} onLaneClick={() => handleLaneClick('top')} expectedCount={LANE_LIMITS.top} selected={selectedCard}/>
        <Lane title="中道" cards={middleLane} onCardClick={(c) => handleCardClick(c, 'middle')} onLaneClick={() => handleLaneClick('middle')} expectedCount={LANE_LIMITS.middle} selected={selectedCard}/>
        <Lane title="尾道" cards={bottomLane} onCardClick={(c) => handleCardClick(c, 'bottom')} onLaneClick={() => handleLaneClick('bottom')} expectedCount={LANE_LIMITS.bottom} selected={selectedCard}/>
      </div>
      {isInvalid && <div className="error-message">无效牌型！</div>}
      <div className="game-actions-new">
        <button onClick={handleConfirm} className="action-button-new confirm" disabled={isInvalid || isLoading}>确认牌型</button>
      </div>
    </div>
  );
};

export default EightCardGame;
