import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { evaluateHand, compareHands, sortCards } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

// 辅助函数：比较两张卡牌是否相同
const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const ThirteenGame = ({ playerHand, otherPlayers, onBackToLobby }) => {
  const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };

  // --- 核心修正 1：恢复您期望的初始发牌逻辑 ---
  // 将拿到的13张牌进行一次默认排序和分配
  const initialSortedHand = sortCards(playerHand || []);
  const [topLane, setTopLane] = useState(initialSortedHand.slice(0, LANE_LIMITS.top));
  const [middleLane, setMiddleLane] = useState(initialSortedHand.slice(LANE_LIMITS.top, LANE_LIMITS.top + LANE_LIMITS.middle));
  const [bottomLane, setBottomLane] = useState(initialSortedHand.slice(LANE_LIMITS.top + LANE_LIMITS.middle));

  const [selectedCards, setSelectedCards] = useState([]);
  const [topLaneHand, setTopLaneHand] = useState(null);
  const [middleLaneHand, setMiddleLaneHand] = useState(null);
  const [bottomLaneHand, setBottomLaneHand] = useState(null);
  const [isInvalid, setIsInvalid] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // 检查是否所有牌道都已填满
  const allLanesFilled = topLane.length === LANE_LIMITS.top &&
                         middleLane.length === LANE_LIMITS.middle &&
                         bottomLane.length === LANE_LIMITS.bottom;

  // “确认牌型”按钮的禁用状态
  const isConfirmDisabled = isLoading || !allLanesFilled || isInvalid;

  useEffect(() => {
    // 只有当所有牌道都放满牌时，才进行合法性校验
    if (allLanesFilled) {
      const topEval = evaluateHand(topLane);
      const middleEval = evaluateHand(middleLane);
      const bottomEval = evaluateHand(bottomLane);

      setTopLaneHand(topEval);
      setMiddleLaneHand(middleEval);
      setBottomLaneHand(bottomEval);

      const middleVsTop = compareHands(middleEval, topEval);
      const bottomVsMiddle = compareHands(bottomEval, middleEval);
      // 如果牌型大小不符合规则，则标记为不合法
      setIsInvalid(middleVsTop < 0 || bottomVsMiddle < 0);
    } else {
      // 只要牌没放完，就不算“不合法”，并清空牌型显示
      setIsInvalid(false);
      setTopLaneHand(null);
      setMiddleLaneHand(null);
      setBottomLaneHand(null);
    }
  }, [topLane, middleLane, bottomLane, allLanesFilled]);
  
  // 点击扑克牌，支持多选
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

  // 点击牌道，移动选中的牌
  const handleLaneClick = (targetLaneName) => {
    if (selectedCards.length === 0) return;

    // 1. 从所有牌道中“拿出”选中的牌
    const removeSelected = (lane) => lane.filter(card => !selectedCards.some(selected => areCardsEqual(selected, card)));
    let newTop = removeSelected(topLane);
    let newMiddle = removeSelected(middleLane);
    let newBottom = removeSelected(bottomLane);

    // 2. 将选中的牌“放入”目标牌道
    if (targetLaneName === 'top') {
      newTop = [...newTop, ...selectedCards];
    } else if (targetLaneName === 'middle') {
      newMiddle = [...newMiddle, ...selectedCards];
    } else if (targetLaneName === 'bottom') {
      newBottom = [...newBottom, ...selectedCards];
    }
    
    // 3. 检查移动后目标牌道是否会超出容量
    if (newTop.length > LANE_LIMITS.top || newMiddle.length > LANE_LIMITS.middle || newBottom.length > LANE_LIMITS.bottom) {
        alert('空间不足，无法放入所选的牌！');
        return; // 取消本次移动
    }

    // 4. 确认移动，更新所有牌道状态并排序，清空选择
    setTopLane(sortCards(newTop));
    setMiddleLane(sortCards(newMiddle));
    setBottomLane(sortCards(newBottom));
    setSelectedCards([]);
  };

  const handleAutoSort = () => {
    const allCards = sortCards([...topLane, ...middleLane, ...bottomLane]);
    setTopLane(allCards.slice(0, 3));
    setMiddleLane(allCards.slice(3, 8));
    setBottomLane(allCards.slice(8, 13));
  };

  const handleConfirm = async () => {
    if (isConfirmDisabled) return;

    setIsLoading(true);
    setTimeout(() => {
      const aiHand = {
        top: otherPlayers['玩家 2']?.slice(0, 3) || [],
        middle: otherPlayers['玩家 2']?.slice(3, 8) || [],
        bottom: otherPlayers['玩家 2']?.slice(8, 13) || [],
      };
      const result = {
        playerHand: { top: topLane, middle: middleLane, bottom: bottomLane },
        aiHand: aiHand,
        score: Math.floor(Math.random() * 21) - 10,
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
            {Object.keys(otherPlayers).map(name => (
                <div key={name} className="player-status-item ready"><span className="player-name">{name}</span><span className="status-text">已准备</span></div>
            ))}
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
