// client/src/components/PlayerHand.jsx
import React from 'react';
import Card from './Card';
import './PlayerHand.css';

const PlayerHand = ({ cards }) => {
  if (!cards || cards.length === 0) {
    return <div className="player-hand-empty">等待发牌...</div>;
  }

  return (
    <div className="player-hand">
      {cards.map((card, index) => (
        <Card key={`${card.suit}-${card.rank}-${index}`} card={card} />
      ))}
    </div>
  );
};

export default PlayerHand;
