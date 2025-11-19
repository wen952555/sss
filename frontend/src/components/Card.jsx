import React from 'react';

const Card = ({ card, onClick, selected }) => {
  // 图片路径
  const imgSrc = `/cards/${card.img}`;

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation(); // 防止冒泡触发牌墩点击
        onClick();
      }} 
      className={`
        relative w-14 h-20 sm:w-20 sm:h-28 bg-white rounded-lg shadow-md transition-all duration-100 cursor-pointer
        ${selected 
          ? 'border-4 border-red-600 z-10' // 选中：红色粗边框，层级提高
          : 'border border-gray-400 hover:brightness-90' // 未选中
        }
      `}
    >
      <img 
        src={imgSrc} 
        alt={`${card.rank} of ${card.suit}`} 
        className="w-full h-full object-contain rounded-md" 
        draggable="false"
      />
    </div>
  );
};

export default Card;