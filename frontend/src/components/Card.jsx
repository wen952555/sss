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
      // --- 核心修改：增大卡牌的尺寸 ---
      style={{
        width: 'min(18vw, 120px)', // 原: min(15vw, 90px)
        height: 'auto',
        minWidth: '60px',         // 原: 45px
        maxWidth: '120px',        // 原: 90px
        maxHeight: '170px',       // 原: 130px
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}>
      <img
        src={imagePath}
        alt={`${card.suit} ${card.rank}`}
        // --- 核心修改：让图片完全填充容器 ---
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'contain' // 确保图片等比缩放
        }}
        draggable={false}
      />
    </div>
  );
};

export default Card;
// --- END OF FILE Card.jsx ---