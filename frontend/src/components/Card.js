import React from 'react';
import './Card.css';

const Card = ({ card, faceDown, onClick }) => {
  const getCardImage = () => {
    if (faceDown) return '/cards/back.png';
    
    if (!card) return '';
    
    const { suit, rank } = card;
    const suits = {
      'clubs': 'clubs',
      'diamonds': 'diamonds',
      'hearts': 'hearts',
      'spades': 'spades'
    };
    
    const ranks = {
      '1': 'ace',
      '11': 'jack',
      '12': 'queen',
      '13': 'king',
      '10': '10'
    };
    
    const suitName = suits[suit] || '';
    const rankName = ranks[rank] || rank;
    
    return `/cards/${rankName}_of_${suitName}.png`;
  };

  return (
    <img 
      src={getCardImage()} 
      alt={card ? `${card.rank} of ${card.suit}` : 'card'} 
      className="playing-card"
      onClick={onClick}
    />
  );
};

export default Card;
