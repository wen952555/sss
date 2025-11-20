// frontend/src/components/Card.jsx
import React from 'react';

const Card = ({ card, onClick, selected }) => {
  const imgSrc = `/cards/${card.img}`;

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }} 
      className={`
        relative 
        /* 核心尺寸调整：高度撑满父容器，宽度根据比例自适应，但限制最大宽 */
        h-full aspect-[2/3] max-w-[100px]
        rounded-lg shadow-md transition-all duration-100 cursor-pointer select-none
        ${selected 
          ? 'border-4 border-red-600 z-10 -translate-y-2' // 选中稍微上浮+红框
          : 'border border-gray-400 hover:brightness-90'
        }
      `}
    >
      <img 
        src={imgSrc} 
        alt={`${card.rank} of ${card.suit}`} 
        className="w-full h-full object-fill rounded-md" 
        draggable="false"
      />
    </div>
  );
};

export default Card;