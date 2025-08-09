// --- START OF FILE Lane.jsx (ABSOLUTELY NO MOVEMENT FIX) ---

import React from 'react';
import Card from './Card';
import './Lane.css'; 

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

  return (
    <div className="lane-wrapper">
      <div className="lane-header">
        <span className="lane-title">{`${title} (${expectedCount})`}</span>
      </div>

      <div className="card-placement-box" onClick={handleAreaClick}>
        {/* --- 核心修改：彻底移除所有动态 style 和位移计算 --- */}
        {cards.map((card, idx) => {
          const isSelected = selectedCards.some(sel => areCardsEqual(sel, card));
          
          return (
            <div 
              key={`${card.rank}-${card.suit}-${idx}`}
              // 唯一的动态部分就是这个 className，它只负责触发 CSS 动画
              className={`card-wrapper ${isSelected ? 'selected' : ''}`}
            >
              <Card
                card={card}
                onClick={onCardClick ? () => onCardClick(card) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Lane;
// --- END OF FILE Lane.jsx (ABSOLUTELY NO MOVEMENT FIX) ---