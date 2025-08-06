// --- START OF FILE Card.jsx ---

import React from 'react';

const Card = ({ card, onClick, isSelected }) => {
  if (!card || card.suit === 'joker') {
    return null;
  }

  const imageName = `${card.rank}_of_${card.suit}.svg`;
  const imagePath = `/cards/${imageName}`;
  
  const cardClassName = `card ${isSelected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`;
  
  // --- 核心修复：定义一个健壮的点击处理函数 ---
  const handleClick = (e) => {
    // 1. 阻止事件冒泡到父级容器（如 Lane.jsx 中的 .lane-container）
    // 这是解决问题的关键，确保点击卡牌不会触发移动逻辑
    e.stopPropagation();
    
    // 2. 如果父组件传递了 onClick 回调，则执行它
    // 注意：这里不再传递事件对象 e，只传递卡牌本身
    if (onClick) {
      onClick(card);
    }
  };

  return (
    <div 
      className={cardClassName} 
      // 使用我们新定义的、健壮的 handleClick 函数
      onClick={handleClick}
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