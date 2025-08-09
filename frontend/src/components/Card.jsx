// --- START OF FILE Card.jsx (CORRECTED) ---

import React from 'react';

const Card = ({ card, onClick, isSelected }) => {
  if (!card || card.suit === 'joker') {
    return null;
  }

  const imageName = `${card.rank}_of_${card.suit}.svg`;
  const imagePath = `/cards/${imageName}`;
  
  const cardClassName = `card ${isSelected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`;
  
  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(card);
    }
  };

  return (
    <div 
      className={cardClassName} 
      onClick={handleClick}
      style={{
        width: 'min(17.5vw, 110px)',
        height: 'auto',
        minWidth: '55px',
        maxWidth: '110px',
        maxHeight: '165px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // --- 核心修复：将 'box-sizing' 改为驼峰命名 'boxSizing' ---
        boxSizing: 'border-box',
      }}>
      <img
        src={imagePath}
        alt={`${card.suit} ${card.rank}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'contain'
        }}
        draggable={false}
      />
    </div>
  );
};

export default Card;
// --- END OF FILE Card.jsx (CORRECTED) ---