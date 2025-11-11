import React from 'react';
import { getCardImageUrl } from '../utils/cardHelper';

const Card = ({ 
  cardCode, 
  onClick, 
  selected = false, 
  disabled = false,
  size = 'normal'
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(cardCode);
    }
  };

  const getCardSize = () => {
    switch (size) {
      case 'small':
        return { width: '40px', height: '56px' };
      case 'large':
        return { width: '80px', height: '112px' };
      default:
        return { width: 'var(--card-width)', height: 'var(--card-height)' };
    }
  };

  return (
    <img
      src={getCardImageUrl(cardCode)}
      alt={cardCode}
      className={`card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      style={getCardSize()}
      draggable="false"
    />
  );
};

export default Card;