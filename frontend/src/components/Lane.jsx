import React from 'react';
import Card from './Card';
import './Lane.css';

// 检查两张牌是否相同
const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const Lane = ({ title, cards, onCardClick, onLaneClick, expectedCount, handType, selected }) => {
  // 支持空白区域点击分牌（移动选中的牌到此墩）
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
            isSelected={areCardsEqual(selected, card)}
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