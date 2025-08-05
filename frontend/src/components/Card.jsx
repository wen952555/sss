import React from 'react';

const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

export const sortCards = (cards) => {
  return [...cards].sort((a, b) => {
    const rankComparison = RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
    if (rankComparison !== 0) {
      return rankComparison;
    }
    const suitOrder = ['diamonds', 'clubs', 'hearts', 'spades'];
    return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
  });
};

const Card = ({ card, onClick, isSelected }) => {
  if (card.suit === 'joker') {
    return null;
  }

  const imageName = `${card.rank}_of_${card.suit}.svg`;
  const imagePath = `/cards/${imageName}`;
  
  const cardClassName = `card ${isSelected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`;

  return (
    <div className={cardClassName} onClick={() => onClick && onClick(card)}
      style={{
        width: 'min(15vw, 90px)',
        height: 'auto',
        minWidth: '45px',
        maxWidth: '90px',
        maxHeight: '130px', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}>
      <img
        src={imagePath}
        alt={`${card.suit} ${card.rank}`}
        style={{
          maxWidth: '100%',
          maxHeight: '125px',
          width: 'auto',
          height: 'auto',
          display: 'block',
        }}
        draggable={false}
      />
    </div>
  );
};

export default Card;