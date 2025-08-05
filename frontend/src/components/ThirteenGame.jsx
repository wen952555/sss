import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { evaluateHand, compareHands } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

// 辅助函数：比较两张卡牌是否相同
const areCardsEqual = (card1, card2) => {
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const ThirteenGame = ({ playerHand, otherPlayers, onBackToLobby }) => {
  const [topLane, setTopLane] = useState(playerHand?.top || []);
  const [middleLane, setMiddleLane] = useState(playerHand?.middle || []);
  const [bottomLane, setBottomLane] = useState(playerHand?.bottom || []);
  
  // --- 核心修改：selectedCards 状态现在是一个数组 ---
  const [selectedCards, setSelectedCards] = useState([]);

  const [topLaneHand, setTopLaneHand] = useState(null);
  const [middleLaneHand, setMiddleLaneHand] = useState(null);
  const [bottomLaneHand, setBottomLaneHand] = useState(null);
  const [isInvalid, setIsInvalid] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };

  useEffect(() => {
    // ... (此 useEffect 逻辑不变)
  }, [topLane, middleLane, bottomLane]);

  // --- 核心修改：重写卡牌点击逻辑以支持多选 ---
  const handleCardClick = (card) => {
    setSelectedCards(prevSelected => {
      const isAlreadySelected = prevSelected.some(selectedCard => areCardsEqual(selectedCard, card));
      if (isAlreadySelected) {
        // 如果已选中，则取消选中
        return prevSelected.filter(selectedCard => !areCardsEqual(selectedCard, card));
      } else {
        // 如果未选中，则加入选中列表
        return [...prevSelected, card];
      }
    });
  };

  // --- 核心修改：重写牌墩点击逻辑以移动多张牌 ---
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

    // 检查目标牌墩是否有足够空间
    if (lanes[targetLaneName].length + selectedCards.length > LANE_LIMITS[targetLaneName]) {
      alert('空间不足，无法放入所选的牌！');
      return;
    }

    // 从所有牌墩中移除选中的牌
    const removeSelected = (lane) => lane.filter(card => !selectedCards.some(selected => areCardsEqual(selected, card)));
    newTopLane = removeSelected(newTopLane);
    newMiddleLane = removeSelected(newMiddleLane);
    newBottomLane = removeSelected(newBottomLane);
    
    // 将选中的牌加入目标牌墩
    const updatedTargetLane = [...lanes[targetLaneName], ...selectedCards]
      .filter(card => !selectedCards.some(selected => areCardsEqual(selected, card))) // 先移除旧位置的牌
      .concat(selectedCards); // 再添加

    if (targetLaneName === 'top') setTopLane(updatedTargetLane);
    if (targetLaneName === 'middle') setMiddleLane(updatedTargetLane);
    if (targetLaneName === 'bottom') setBottomLane(updatedTargetLane);
    
    // 移动后清空选择
    setSelectedCards([]);
  };

  // ... (handleAutoSort, handleConfirm, handleCloseResult 逻辑不变)

  return (
    <div className="table-root">
      <div className="table-panel">
        {/* ... (顶部栏和玩家状态栏 JSX 不变) */}

        <div className="table-lanes-area">
          <Lane
              title="头道" cards={topLane}
              onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('top')}
              selectedCards={selectedCards} // --- 传递多选数组
              expectedCount={LANE_LIMITS.top} handType={topLaneHand?.name}
            />
          <Lane
              title="中道" cards={middleLane}
              onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')}
              selectedCards={selectedCards} // --- 传递多选数组
              expectedCount={LANE_LIMITS.middle} handType={middleLaneHand?.name}
            />
          <Lane
              title="尾道" cards={bottomLane}
              onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('bottom')}
              selectedCards={selectedCards} // --- 传递多选数组
              expectedCount={LANE_LIMITS.bottom} handType={bottomLaneHand?.name}
            />
        </div>
        
        {/* ... (错误信息和操作按钮 JSX 不变) */}
      </div>
      {/* ... (加载和结果弹窗 JSX 不变) */}
    </div>
  );
};

export default ThirteenGame;