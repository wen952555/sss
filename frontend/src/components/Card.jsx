import React from 'react';

const Card = ({ card, onClick, selected }) => {
  // 假设 card 对象: { suit: 'spades', rank: 'ace', img: 'ace_of_spades.svg' }
  // 图片路径指向 public/cards/
  const imgSrc = `/cards/${card.img}`;

  return (
    <div 
      onClick={onClick} 
      className={`
        relative w-16 h-24 bg-white rounded border shadow-sm transition-transform duration-200
        ${selected ? '-translate-y-4 border-yellow-400 border-2' : 'border-gray-300'}
      `}
    >
      <img src={imgSrc} alt={`${card.rank} of ${card.suit}`} className="w-full h-full object-contain" />
    </div>
  );
};

export default Card;