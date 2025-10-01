// frontend/src/components/Card.jsx
import React from 'react';
import { getCardImageUrl } from '../utils/cardUtils';
import './Card.css';

const Card = ({ card, onClick, isSelected }) => {
  const imageUrl = getCardImageUrl(card);
  const cardClasses = `card ${isSelected ? 'selected' : ''}`;

  return (
    <div className={cardClasses} onClick={onClick}>
      <img src={imageUrl} alt={`${card.rank} of ${card.suit}`} />
    </div>
  );
};

export default Card;