// --- FIX: Lane.jsx 保持弹起牌在堆叠位置，仅高度弹起不覆盖后牌 ---

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
        {cards.map((card, idx) => {
          const isSelected = selectedCards.some(sel => areCardsEqual(sel, card));
          // 堆叠效果：每张牌左移固定像素，弹起只是Y方向
          return (
            <div 
              key={`${card.rank}-${card.suit}-${idx}`}
              className={`card-wrapper${isSelected ? ' selected' : ''}`}
              style={{
                position: 'relative',
                left: `${idx === 0 ? 0 : -34 * idx}px`,
                zIndex: isSelected ? 10 : idx,
                transform: isSelected ? 'translateY(-20px)' : 'none',
                transition: 'box-shadow 0.2s, transform 0.18s',
              }}
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
// --- END FIX ---