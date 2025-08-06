// --- START OF FILE Card.jsx ---

import React from 'react';

// --- 已将 sortCards 函数和 RANK_ORDER 移动到 pokerEvaluator.js ---

const Card = ({ card, onClick, isSelected }) => {
  if (!card || card.suit === 'joker') {
    return null;
  }

  const imageName = `${card.rank}_of_${card.suit}.svg`;
  const imagePath = `/cards/${imageName}`;
  
  const cardClassName = `card ${isSelected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`;
  
  // --- 核心修正：创建一个新的点击处理函数 ---
  const handleClick = (e) => {
    // 1. 阻止事件冒泡到父级容器（Lane），这是解决问题的关键
    e.stopPropagation();
    // 2. 如果存在从父级传入的 onClick 回调，则执行它
    if (onClick) {
      onClick(card);
    }
  };

  return (
    // --- 核心修正：使用新的 handleClick 函数 ---
    <div className={cardClassName} onClick={handleClick}
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

// --- END OF FILE Card.jsx ---