import React from 'react';
import Card from './Card';

const Hand = ({ cards, selectedCards, onCardClick }) => {
  const isSelected = (card) => 
    selectedCards.some(c => c.rank === card.rank && c.suit === card.suit);

  return (
    <div className="player-main-hand">
      <h3>你的手牌</h3>
      <div className="card-container">
        {cards.map((card, index) => (
          <Card 
            key={`${card.rank}-${card.suit}-${index}`}
            card={card}
            onClick={onCardClick}
            isSelected={isSelected(card)}
          />
        ))}
      </div>
    </div>
  );
};

export default Hand;
