// --- START OF FILE Card.jsx ---

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
      // --- 核心修复：恢复到原始或略大的合理尺寸 ---
      style={{
        width: 'min(16vw, 100px)', // 宽度适中
        height: 'auto',
        minWidth: '50px',
        maxWidth: '100px',        // 最大宽度100px
        maxHeight: '150px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
// --- END OF FILE Card.jsx ---