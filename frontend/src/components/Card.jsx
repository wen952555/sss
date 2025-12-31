import React from 'react';
import { getCardImage, getCardText, getCardColorClass } from '../utils/cardUtils';

const Card = ({ 
  cardCode, 
  isSelected = false, 
  onClick = null, 
  size = 'md',
  showBack = false,
  className = '',
  disabled = false 
}) => {
  const sizes = {
    xs: 'w-8 h-12 text-xs',
    sm: 'w-10 h-16 text-sm',
    md: 'w-12 h-20 text-base',
    lg: 'w-16 h-24 text-lg',
    xl: 'w-20 h-32 text-xl'
  };
  
  const sizeClass = sizes[size] || sizes.md;
  
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(cardCode);
    }
  };
  
  if (showBack) {
    return (
      <div 
        className={`
          ${sizeClass}
          ${className}
          bg-gradient-to-br from-blue-900 to-blue-800
          rounded-lg
          border-2 border-white
          shadow-lg
          flex items-center justify-center
          cursor-pointer
          transition-transform duration-200
          hover:scale-105
          active:scale-95
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={handleClick}
      >
        <div className="text-white text-2xl font-bold">
          🃏
        </div>
      </div>
    );
  }
  
  const isRed = cardCode && (cardCode[0] === 'H' || cardCode[0] === 'D' || cardCode === 'RJ');
  const text = getCardText(cardCode);
  
  return (
    <div 
      className={`
        ${sizeClass}
        ${className}
        bg-white
        rounded-lg
        border-2 ${isSelected ? 'border-yellow-400 border-4' : 'border-gray-300'}
        shadow-lg
        flex flex-col items-center justify-center
        cursor-pointer
        transition-all duration-200
        hover:scale-105
        hover:shadow-xl
        active:scale-95
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        relative overflow-hidden
      `}
      onClick={handleClick}
    >
      {/* 牌面顶部标识 */}
      <div className={`absolute top-1 left-1 font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>
        {text}
      </div>
      
      {/* 牌面中间图案 */}
      <div className={`text-2xl font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>
        {cardCode === 'RJ' ? '大王' : cardCode === 'BJ' ? '小王' : getCardText(cardCode)[0]}
      </div>
      
      {/* 牌面底部标识 */}
      <div className={`absolute bottom-1 right-1 font-bold ${isRed ? 'text-red-600' : 'text-black'} rotate-180`}>
        {text}
      </div>
      
      {/* 花色装饰 */}
      <div className="absolute inset-0 opacity-10">
        {cardCode && cardCode[0] && (
          <div className="flex items-center justify-center h-full text-4xl">
            {cardCode[0] === 'S' && '♠'}
            {cardCode[0] === 'H' && '♥'}
            {cardCode[0] === 'D' && '♦'}
            {cardCode[0] === 'C' && '♣'}
            {cardCode === 'RJ' && '🃏'}
            {cardCode === 'BJ' && '🃏'}
          </div>
        )}
      </div>
    </div>
  );
};

export const CardImage = ({ 
  cardCode, 
  size = 'md',
  className = ''
}) => {
  const sizes = {
    xs: 'w-8 h-12',
    sm: 'w-10 h-16',
    md: 'w-12 h-20',
    lg: 'w-16 h-24',
    xl: 'w-20 h-32'
  };
  
  const sizeClass = sizes[size] || sizes.md;
  const imageSrc = getCardImage(cardCode);
  
  return (
    <img 
      src={imageSrc}
      alt={getCardText(cardCode)}
      className={`
        ${sizeClass}
        ${className}
        rounded-lg
        shadow-md
        object-cover
      `}
      onError={(e) => {
        e.target.src = '/images/cards/card_back.svg';
      }}
    />
  );
};

export default Card;