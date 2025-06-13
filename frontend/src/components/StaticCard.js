// frontend/src/components/StaticCard.js
import React from 'react';
import { POKER_IMAGE_PATH } from '../config'; // 确保导入路径正确

const StaticCard = ({ cardData }) => {
  if (!cardData || typeof cardData.image !== 'string' || cardData.image.trim() === '') {
    return (
      <div 
        className="card card-placeholder static-card-placeholder" // 添加特定类以便调整样式
        style={{ /* 保持与 CardComponent 中占位符类似的样式 */ }}
      >
        ?
      </div>
    );
  }
  const imageUrl = `${process.env.PUBLIC_URL}${POKER_IMAGE_PATH}${cardData.image}`;

  return (
    // 移除 Draggable 包裹
    <div
      className="card static-card" // 添加特定类以便调整样式
      title={cardData.name || cardData.id}
    >
      <img 
        src={imageUrl} 
        alt={cardData.name || cardData.id} 
        onError={(e) => { 
          console.error("StaticCard failed to load image:", imageUrl);
          e.target.style.display = 'none';
          const parent = e.target.parentNode;
          if (parent && !parent.querySelector('.image-error-text')) {
              const errorText = document.createElement('span');
              errorText.className = 'image-error-text';
              errorText.textContent = 'X'; // 更简洁的错误提示
              parent.appendChild(errorText);
          }
        }}
      />
    </div>
  );
};

export default StaticCard;
