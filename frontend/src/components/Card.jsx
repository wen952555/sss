// frontend/src/components/Card.jsx
import React from 'react';
import { getCardImageUrl } from '../utils/cardUtils';
import './Card.css';

const Card = ({ card, onClick, isSelected }) => {
  const imageUrl = getCardImageUrl(card);
  const cardClasses = `card ${isSelected ? 'selected' : ''}`;

  const getAltText = () => {
    if (!card) return '卡牌背面';

    if (card.rank === 'red_joker') return '大王';
    if (card.rank === 'black_joker') return '小王';

    const suits = {
      spades: '黑桃',
      hearts: '红桃',
      diamonds: '方片',
      clubs: '梅花',
    };
    
    const suit = suits[card.suit] || card.suit;
    const rank = card.rank;

    return `${suit} ${rank}`;
  }

  return (
    <div className={cardClasses} onClick={onClick}>
      <img src={imageUrl} alt={getAltText()} />
    </div>
  );
};

export default Card;
