import React from 'react';

const Card = ({ card, onDragStart, onDrop, draggable }) => {
  // 构建图片路径
  const getImagePath = () => {
    if (!card) return '';
    
    const valueMap = {
      '1': 'ace', '11': 'jack', '12': 'queen', '13': 'king'
    };
    
    const suitMap = {
      'C': 'clubs', 'D': 'diamonds', 'H': 'hearts', 'S': 'spades'
    };
    
    let valueName = valueMap[card.value] || card.value;
    const suitName = suitMap[card.suit];
    
    return `/cards/${valueName}_of_${suitName}.svg`;
  };

  const handleDragStart = (e) => {
    if (onDragStart && draggable) {
      onDragStart(e, card);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (onDrop) {
      onDrop(card);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div 
      className="card"
      draggable={draggable}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <img 
        src={getImagePath()} 
        alt={`${card.value} of ${card.suit}`} 
        className="card-image"
      />
    </div>
  );
};

export default Card;
