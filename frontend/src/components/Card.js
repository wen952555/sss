// frontend/src/components/Card.js
import React from 'react';
import { getCardImageUrl } from '../utils/cardUtils';
import './Card.css'; // 我们会添加一些CSS

const Card = ({ card, faceUp = true, onClick, className = '', isSelected, style = {} }) => {
  const imageUrl = faceUp ? getCardImageUrl(card) : getCardImageUrl('back'); // 使用工具函数获取背面图片
  const altText = faceUp ? card : 'Card Back';

  return (
    <img
      src={imageUrl}
      alt={altText}
      onClick={onClick ? () => onClick(card) : undefined} // 传递card本身给onClick回调
      className={`card-image ${className} ${isSelected ? 'selected' : ''}`}
      style={{
        width: '70px', // 根据需要调整大小
        height: '100px',
        margin: '2px',
        cursor: onClick ? 'pointer' : 'default',
        border: isSelected ? '2px solid blue' : '1px solid #ccc', // 选中效果
        borderRadius: '5px',
        ...style
      }}
      draggable={false} // 防止图片默认拖拽行为
    />
  );
};

export default Card;
