import React from 'react';

const Card = ({ card, onClick, isSelected, isPlayed }) => {
  if (!card) return null;
  
  const getCardImage = () => {
    const { suit, value } = card;
    let valueName;
    
    if (value === 1) valueName = 'ace';
    else if (value === 11) valueName = 'jack';
    else if (value === 12) valueName = 'queen';
    else if (value === 13) valueName = 'king';
    else valueName = value.toString();
    
    return `${valueName}_of_${suit}`;
  };

  return (
    <div 
      className={`card ${isSelected ? 'selected' : ''} ${isPlayed ? 'played' : ''}`}
      onClick={onClick}
    >
      <img 
        src={`/images/cards/${getCardImage()}.svg`} 
        alt={`${card.value} of ${card.suit}`}
        className="card-image"
      />
    </div>
  );
};

export default Card;
