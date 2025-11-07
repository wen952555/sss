import React from 'react';
import { getCardImageUrl } from '../utils/cardMapper';

// 简单的卡牌组件
const Card = ({ cardCode, width = 80 }) => {
  const imageUrl = getCardImageUrl(cardCode);

  return (
    <img 
      src={imageUrl} 
      alt={`Card ${cardCode}`} 
      style={{ width: `${width}px`, height: 'auto', margin: '2px' }}
    />
  );
};

export default Card;