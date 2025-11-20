// frontend/src/components/Card.jsx
import React from 'react';

const Card = ({ card, onClick, selected, style }) => {
  const imgSrc = `/cards/${card.img}`;

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }} 
      // style 允许父组件传入 z-index 或特定的偏移
      style={style}
      className={`
        relative 
        /* 尺寸定义: 宽度固定，高度自适应，保持比例 */
        w-[70px] sm:w-[90px] aspect-[2/3]
        /* 核心: 负左边距实现堆叠效果 (第一张牌除外) */
        -ml-[45px] sm:-ml-[60px] first:ml-0
        
        rounded-lg shadow-[2px_0_5px_rgba(0,0,0,0.3)] transition-all duration-200 cursor-pointer select-none bg-white
        hover:z-20 hover:-translate-y-2 /* 鼠标悬停效果 */
        
        ${selected 
          ? 'border-2 border-red-600 z-30 -translate-y-4 shadow-xl' // 选中: 红色边框，层级最高，明显上浮
          : 'border border-gray-300'
        }
      `}
    >
      <img 
        src={imgSrc} 
        alt={`${card.rank} of ${card.suit}`}
        className="w-full h-full object-fill rounded-md pointer-events-none" 
      />
      {/* 遮罩层: 当多选时，未选中的牌稍微变暗，突出选中的牌 (可选优化) */}
      {/* <div className={`absolute inset-0 bg-black/10 rounded-md ${selected ? 'hidden' : 'hidden'}`}></div> */}
    </div>
  );
};

export default Card;