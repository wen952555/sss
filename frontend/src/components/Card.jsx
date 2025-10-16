// frontend/src/components/Card.jsx
import React from 'react';
import { getCardImageUrl } from '../utils/cardUtils';
import './Card.css';

const Card = ({ card, onClick, isSelected }) => {
  const imageUrl = getCardImageUrl(card);
  const cardClasses = `card ${isSelected ? 'selected' : ''}`;

  const getAltText = () => {
    if (!card) return 'Card back';

    if (card.rank === 'red_joker') return 'Red Joker';
    if (card.rank === 'black_joker') return 'Black Joker';

    const suits = {
      spades: 'Spades',
      hearts: 'Hearts',
      diamonds: 'Diamonds',
      clubs: 'Clubs',
    };
    
    const suit = suits[card.suit] || card.suit;
    const rank = card.rank;

    return `${rank} of ${suit}`;
  }

  return (
    <div className={cardClasses} onClick={onClick}>
      <img src={imageUrl} alt={getAltText()} />
    </div>
  );
};

export default Card;
