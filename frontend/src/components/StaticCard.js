// frontend/src/components/StaticCard.js
import React from 'react';
import { POKER_IMAGE_PATH } from '../config';

const StaticCard = ({ cardData, style }) => {
  if (!cardData || typeof cardData.image !== 'string' || cardData.image.trim() === '') {
    return (
      <div 
        className="card static-card card-placeholder static-card-placeholder"
        style={style || {}} // 确保 style 即使未传递也是一个对象
      >
        ?
      </div>
    );
  }

  const imageUrl = `${process.env.PUBLIC_URL}${POKER_IMAGE_PATH}${cardData.image}`;

  const handleError = (e) => {
    console.error(`StaticCard failed to load image: ${imageUrl}`, e);
    const imgElement = e.target;
    const parentElement = imgElement.parentNode;

    // 只在图片加载失败时隐藏图片并显示错误文本
    imgElement.style.display = 'none'; 

    if (parentElement && !parentElement.querySelector('.image-error-text')) {
      const errorText = document.createElement('span');
      errorText.className = 'image-error-text';
      errorText.textContent = 'X';
      parentElement.appendChild(errorText);
    }
  };

  return (
    <div
      className="card static-card"
      title={cardData.name || cardData.id}
      style={style || {}} // 确保 style 即使未传递也是一个对象
    >
      <img 
        src={imageUrl} 
        alt={cardData.name || cardData.id} 
        loading="lazy"
        onError={handleError} // 使用独立的错误处理函数
      />
    </div>
  );
}; // 函数组件定义的末尾，如果不是模块最后一句，可以加分号，但通常 prettier 等工具会处理

export default StaticCard; // export default 语句末尾通常有分号
