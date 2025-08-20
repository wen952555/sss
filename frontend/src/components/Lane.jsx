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
      <div className="lane-header"><span className="lane-title">{`${title} (${expectedCount})`}</span></div>
      <div className="card-placement-box" onClick={handleAreaClick}>
        {cards.map((card, idx) => {
          const isSelected = selectedCards.some(sel => areCardsEqual(sel, card));
          // 弹起牌仅提升一点，不遮盖后面牌
          return (
            <div
              key={`${card.rank}-${card.suit}-${idx}`}
              className={`card-wrapper${isSelected ? ' selected' : ''}`}
              style={{
                position: 'relative',
                left: `${idx === 0 ? 0 : -22 * idx}px`,
                zIndex: isSelected ? idx + 2 : idx,
                overflow: 'visible',
                width: '105px',
                minWidth: '54px',
                maxWidth: '105px',
                height: '155px',
                transform: isSelected ? 'translateY(-16px) scale(1.06)' : 'none',
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