// --- Lane.jsx: 弹起只Y轴，堆叠层级始终按索引，始终保持遮挡 ---
import React from 'react';
import Card from './Card';
import './Lane.css';

const areCardsEqual = (card1, card2) =>
  card1 && card2 && card1.rank === card2.rank && card1.suit === card2.suit;

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
          return (
            <div
              key={`${card.rank}-${card.suit}-${idx}`}
              className={`card-wrapper${isSelected ? ' selected' : ''}`}
              style={{
                position: 'relative',
                left: `${idx === 0 ? 0 : -34 * idx}px`,
                zIndex: idx, // 永远保持原堆叠遮挡顺序
                transform: isSelected ? 'translateY(-20px) scale(1.08)' : 'none', // 只弹起Y轴
                transition: 'box-shadow 0.2s, transform 0.18s',
                pointerEvents: 'auto'
              }}
            >
              <Card
                card={card}
                onClick={onCardClick ? () => onCardClick(card) : undefined}
                isSelected={isSelected}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Lane;