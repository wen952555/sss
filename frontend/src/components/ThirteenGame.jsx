import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { evaluateHand, compareHands, sortCards } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

// 辅助函数：比较两张卡牌是否相同
const areCardsEqual = (card1, card2) => {
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const ThirteenGame = ({ playerHand, otherPlayers, onBackToLobby }) => {
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

  const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };

  useEffect(() => {
    // 评估每道牌的牌型
    const topEval = evaluateHand(topLane);
    const middleEval = evaluateHand(middleLane);
    const bottomEval = evaluateHand(bottomLane);

    setTopLaneHand(topEval);
    setMiddleLaneHand(middleEval);
    setBottomLaneHand(bottomEval);

    // 检查是否满足牌型大小规则（尾道 > 中道 > 头道）
    const allCardsPlaced = topLane.length + middleLane.length + bottomLane.length === 13;
    if (allCardsPlaced) {
      const middleVsTop = compareHands(middleEval, topEval);
      const bottomVsMiddle = compareHands(bottomEval, middleEval);
      if (middleVsTop < 0 || bottomVsMiddle < 0) {
        setIsInvalid(true);
      } else {
        setIsInvalid(false);
      }
    } else {
      setIsInvalid(false); // 牌没放完时不提示错误
    }
  }, [topLane, middleLane, bottomLane]);

  const handleCardClick = (card) => {
    setSelectedCards(prevSelected => {
      const isAlreadySelected = prevSelected.some(selectedCard => areCardsEqual(selectedCard, card));
      if (isAlreadySelected) {
        return prevSelected.filter(selectedCard => !areCardsEqual(selectedCard, card));
      } else {
        return [...prevSelected, card];
      }
    });
  };

  const handleLaneClick = (targetLaneName) => {
    if (selectedCards.length === 0) return;

    let newTopLane = [...topLane];
    let newMiddleLane = [...middleLane];
    let newBottomLane = [...bottomLane];

    const lanes = {
      top: newTopLane,
      middle: newMiddleLane,
      bottom: newBottomLane,
    };

    if (lanes[targetLaneName].length + selectedCards.length > LANE_LIMITS[targetLaneName]) {
      alert('空间不足，无法放入所选的牌！');
      return;
    }

    const removeSelected = (lane) => lane.filter(card => !selectedCards.some(selected => areCardsEqual(selected, card)));
    newTopLane = removeSelected(newTopLane);
    newMiddleLane = removeSelected(newMiddleLane);
    newBottomLane = removeSelected(newBottomLane);
    
    const allCards = [...newTopLane, ...newMiddleLane, ...newBottomLane, ...lanes[targetLaneName]];
    const updatedTargetLane = [...lanes[targetLaneName], ...selectedCards]
        .filter(c => !allCards.includes(c)) // 先移除旧位置的牌
        .concat(selectedCards);

    if (targetLaneName === 'top') setTopLane(sortCards(updatedTargetLane));
    if (targetLaneName === 'middle') setMiddleLane(sortCards(updatedTargetLane));
    if (targetLaneName === 'bottom') setBottomLane(sortCards(updatedTargetLane));
    
    setSelectedCards([]);
  };

  // --- 添加的功能函数 ---
  const handleAutoSort = () => {
    // 这是一个简化的自动理牌逻辑，仅按大小排序
    // 实际游戏需要更复杂的AI来寻找最优组合
    const allCards = sortCards([...topLane, ...middleLane, ...bottomLane]);
    setTopLane(allCards.slice(0, 3));
    setMiddleLane(allCards.slice(3, 8));
    setBottomLane(allCards.slice(8, 13));
    alert('已为您进行基础排序，请检查牌型是否最优！');
  };

  const handleConfirm = async () => {
    if (topLane.length + middleLane.length + bottomLane.length !== 13) {
      alert('请将所有13张牌都摆放到牌道中！');
      return;
    }
    if (isInvalid) {
      alert('当前牌型不符合规则，无法确认！');
      return;
    }

    setIsLoading(true);
    // 模拟API调用和AI比牌
    setTimeout(() => {
      const aiHand = {
        top: otherPlayers['玩家 2']?.slice(0, 3),
        middle: otherPlayers['玩家 2']?.slice(3, 8),
        bottom: otherPlayers['玩家 2']?.slice(8, 13),
      };
      
      const result = {
        playerHand: { top: topLane, middle: middleLane, bottom: bottomLane },
        aiHand: aiHand,
        score: Math.floor(Math.random() * 21) - 10, // 模拟得分
      };

      setGameResult(result);
      setIsLoading(false);
    }, 1500);
  };
  
  const handleCloseResult = () => {
    setGameResult(null);
    onBackToLobby();
  };
  // --- 功能函数添加完毕 ---

  return (
    <div className="table-root">
      <div className="table-panel">
        <div className="table-top-bar">
          <button onClick={onBackToLobby} className="table-quit-btn">退出游戏</button>
          <div className="table-score-box">积分: {playerHand?.points || 1000}</div>
        </div>
        
        <div className="players-status-bar">
            <div className="player-status-item you"><span className="player-name">你</span><span className="status-text">理牌中...</span></div>
            {Object.keys(otherPlayers).map(name => (
                <div key={name} className="player-status-item ready"><span className="player-name">{name}</span><span className="status-text">已准备</span></div>
            ))}
        </div>

        <div className="table-lanes-area">
          <Lane
              title="头道" cards={topLane}
              onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('top')}
              selectedCards={selectedCards}
              expectedCount={LANE_LIMITS.top} handType={topLaneHand?.name}
            />
          <Lane
              title="中道" cards={middleLane}
              onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')}
              selectedCards={selectedCards}
              expectedCount={LANE_LIMITS.middle} handType={middleLaneHand?.name}
            />
          <Lane
              title="尾道" cards={bottomLane}
              onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('bottom')}
              selectedCards={selectedCards}
              expectedCount={LANE_LIMITS.bottom} handType={bottomLaneHand?.name}
            />
        </div>
        
        {/* --- 恢复的JSX代码 --- */}
        {isInvalid && <p className="error-message">牌型不符合规则！(尾道 ≥ 中道 ≥ 头道)</p>}

        <div className="table-actions-bar">
          <button onClick={handleAutoSort} className="action-btn orange">自动理牌</button>
          <button onClick={handleConfirm} disabled={isInvalid || isLoading} className="action-btn green">确认牌型</button>
        </div>
        {/* --- JSX恢复完毕 --- */}

        {isLoading && <div className="loading-overlay">正在比牌...</div>}
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default ThirteenGame;
