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
      // --- 核心修改：整体尺寸增加 10% 以适应更高的牌墩 ---
      style={{
        width: 'min(17.5vw, 110px)', // 原为 16vw, 100px
        height: 'auto',
        minWidth: '55px',             // 相应增加
        maxWidth: '110px',            // 原为 100px
        maxHeight: '165px',           // 原为 150px
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        box-sizing: 'border-box',
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