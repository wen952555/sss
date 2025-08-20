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
        <div className="card-lane">
          {cards.map((card, idx) => {
            const isSelected = selectedCards.some(sel => areCardsEqual(sel, card));
            return (
              <div
                key={`${card.rank}-${card.suit}-${idx}`}
                className={`card-wrapper${isSelected ? ' selected' : ''}`}
                style={{ zIndex: isSelected ? 100 + idx : idx }}
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
    </div>
  );
};

export default Lane;