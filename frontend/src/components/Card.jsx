import React from 'react';

// --- 已将 sortCards 函数和 RANK_ORDER 移动到 pokerEvaluator.js ---

const Card = ({ card, onClick, isSelected }) => {
  if (!card || card.suit === 'joker') {
    return null;
  }

  const imageName = `${card.rank}_of_${card.suit}.svg`;
  const imagePath = `/cards/${imageName}`;
  
  const cardClassName = `card ${isSelected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`;

  return (
    <div className={cardClassName} onClick={() => onClick && onClick(card)}
      style={{
        width: 'min(15vw, 90px)',
        height: 'auto',
        minWidth: '45px',
        maxWidth: '90px',
        maxHeight: '130px', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}>
      <img
        src={imagePath}
        alt={`${card.suit} ${card.rank}`}
        style={{
          maxWidth: '100%',
          maxHeight: '125px',
          width: 'auto',
          height: 'auto',
          display: 'block',
        }}
        draggable={false}
      />
    </div>
  );
};

export default Card;
