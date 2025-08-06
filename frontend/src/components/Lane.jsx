import React from 'react';
import Card from './Card';
import './Lane.css';

// 比较卡牌是否相同
const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const Lane = ({ title, cards, onCardClick, onLaneClick, expectedCount, handType, selectedCards = [] }) => {
  // 允许点击整个牌墩区域（包括卡牌和空白）都触发移动
  const handleAreaClick = (e) => {
    // 只有选中牌时才触发移动逻辑
    if (selectedCards.length > 0 && onLaneClick) onLaneClick();
  };

  return (
    <div className="lane-container">
      {/* 点击牌墩区域都能触发移动（而不是只有空白） */}
      <div className="card-display-area" onClick={handleAreaClick}>
        {cards.map((card, index) => (
          <Card
            key={`${card.rank}-${card.suit}-${index}`}
            card={card}
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
