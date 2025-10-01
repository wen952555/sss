// client/src/components/Card.jsx
import React from 'react';
import { getCardImageUrl } from '../utils/cardUtils';
import './Card.css'; // 我们会添加一些样式

const Card = ({ card }) => {
  const imageUrl = getCardImageUrl(card);

  return (
    <div className="card">
      <img src={imageUrl} alt={`${card.rank} of ${card.suit}`} />
    </div>
  );
};

export default Card;
