import React from 'react';
import Card from './Card';
import './Lane.css';

// 检查两张牌是否相同
const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const Lane = ({ title, cards, onCardClick, expectedCount, handType, selected }) => {
  const handleCardClick = onCardClick || (() => {});

  return (
    <div className="lane-container">
      <div className="card-display-area">
        {cards.map((card, index) => (
          <Card 
            key={`${card.rank}-${card.suit}-${index}`} 
            card={card}
            // 检查这张牌是否是当前选中的牌
            isSelected={areCardsEqual(selected, card)}
            onClick={() => handleCardClick(card)}
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
