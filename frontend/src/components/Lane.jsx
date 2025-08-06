import React from 'react';
import Card from './Card';
import './Lane.css';

const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const Lane = ({
  title, cards, onCardClick, onLaneClick,
  expectedCount, handType, selectedCards = [],
}) => {
  // 允许点击整个牌墩区域触发移动，无论点到哪个区域
  const handleAreaClick = () => {
    if (selectedCards.length > 0 && onLaneClick) onLaneClick();
  };

  return (
    <div className="lane-container">
      <div className="card-display-area" onClick={handleAreaClick}>
        {cards.map((card, idx) => (
          <Card
            key={`${card.rank}-${card.suit}-${idx}`}
            card={card}
            isSelected={selectedCards.some(sel => areCardsEqual(sel, card))}
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
