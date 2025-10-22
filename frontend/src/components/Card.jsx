import React from 'react';

const Card = ({ card, onClick, isSelected }) => {
  if (!card || card.suit === 'joker') return null;

  const rankMap = {
    'A': 'ace',
    'K': 'king',
    'Q': 'queen',
    'J': 'jack',
  };
  const rankName = rankMap[card.rank] || card.rank;
  const imageName = `${rankName}_of_${card.suit}.svg`;
  const imagePath = `/cards/${imageName}`;
  const cardClassName = `card ${isSelected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`;

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) onClick(card);
  };

  return (
    <div 
      className={cardClassName} 
      onClick={handleClick}
      style={{
        width: '100%',
        height: '100%',
        minWidth: '0',
        maxWidth: 'none',
        boxSizing: 'border-box',
        border: 'none',
        borderRadius: '9px',
        boxShadow: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
      <img
        src={imagePath}
        alt={`${card.suit} ${card.rank}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block'
        }}
        draggable={false}
      />
    </div>
  );
};

export default Card;