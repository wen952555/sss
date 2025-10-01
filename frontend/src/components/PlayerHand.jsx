// frontend/src/components/PlayerHand.jsx
import React from 'react';
import Card from './Card';
import './PlayerHand.css';

const PlayerHand = ({ cards, onCardClick, selectedCard }) => {
  if (!cards || cards.length === 0) {
    return <div className="player-hand-empty">Waiting for cards...</div>;
  }

  return (
    <div className="player-hand">
      {cards.map((card, index) => (
        <Card
            key={`${card.suit}-${card.rank}-${index}`}
            card={card}
            onClick={() => onCardClick(card)}
            isSelected={selectedCard && selectedCard.card.suit === card.suit && selectedCard.card.rank === card.rank}
        />
      ))}
    </div>
  );
};

export default PlayerHand;