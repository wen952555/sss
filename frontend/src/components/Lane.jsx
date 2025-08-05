import React from 'react';
import Card from './Card';
import './Lane.css';

// 辅助函数：比较两张卡牌是否相同
const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

// --- 核心修改：接收 selectedCards 数组 ---
const Lane = ({ title, cards, onCardClick, onLaneClick, expectedCount, handType, selectedCards = [] }) => {
  
  // 支持空白区域点击分牌
  const handleAreaClick = (e) => {
    // 避免点击到卡牌本身时触发
    if (e.target !== e.currentTarget) return;
    if (onLaneClick) onLaneClick();
  };

  return (
    <div className="lane-container" onClick={handleAreaClick}>
      <div className="card-display-area">
        {cards.map((card, index) => (
          <Card
            key={`${card.rank}-${card.suit}-${index}`}
            card={card}
            // --- 核心修改：检查当前卡牌是否在多选数组中 ---
            isSelected={selectedCards.some(selected => areCardsEqual(selected, card))}
            onClick={onCardClick ? () => onCardClick(card) : undefined}
          />
        ))}
      </div>
      <div className="lane-info">
        <span className="lane-title">{`${title} (${expectedCount})`}</span>
        {handType && <span className="lane-hand-type">{handType}</span>}
      </div>
    </div>
  );
};

export default Lane;