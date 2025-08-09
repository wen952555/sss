// --- START OF FILE Lane.jsx (CORRECTED STRUCTURE) ---

import React from 'react';
import Card from './Card';
import './Lane.css'; // 我们将彻底重写这个CSS

const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const Lane = ({
  title, cards, onCardClick, onLaneClick,
  expectedCount, selectedCards = [],
}) => {

  const handleAreaClick = () => {
    if (selectedCards.length > 0 && onLaneClick) {
      onLaneClick();
    }
  };

  // --- 核心修改：重构JSX结构，将标题和置牌区彻底分离 ---
  return (
    <div className="lane-wrapper">
      {/* 1. 独立的标题部分 */}
      <div className="lane-header">
        <span className="lane-title">{`${title} (${expectedCount})`}</span>
      </div>

      {/* 2. 您要求的、带边框、固定高度的“置牌区” */}
      <div className="card-placement-box" onClick={handleAreaClick}>
        {cards.map((card, idx) => (
          <div 
            key={`${card.rank}-${card.suit}-${idx}`}
            className={`card-wrapper ${selectedCards.some(sel => areCardsEqual(sel, card)) ? 'selected' : ''}`}
          >
            <Card
              card={card}
              onClick={onCardClick ? () => onCardClick(card) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Lane;
// --- END OF FILE Lane.jsx (CORRECTED STRUCTURE) ---