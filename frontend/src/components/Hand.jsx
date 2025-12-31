import React, { useState } from 'react';
import Card from './Card';

const Hand = ({ 
  cards = [], 
  playerName = '玩家',
  isCurrentPlayer = false,
  onCardClick = null,
  selectedCards = [],
  disabled = false,
  orientation = 'horizontal'
}) => {
  const [hoveredCard, setHoveredCard] = useState(null);
  
  if (orientation === 'vertical') {
    return (
      <div className="flex flex-col items-center space-y-2 p-4">
        <div className="text-white font-bold mb-2">{playerName}</div>
        <div className="flex flex-col space-y-1">
          {cards.map((card, index) => {
            const isSelected = selectedCards.includes(`${playerName}-${index}`);
            
            return (
              <div key={index} className="relative">
                <Card
                  cardCode={card}
                  isSelected={isSelected}
                  onClick={() => onCardClick && onCardClick(index)}
                  size="sm"
                  disabled={disabled}
                  className={`
                    transition-all duration-200
                    ${hoveredCard === index ? '-translate-x-2' : ''}
                  `}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center space-y-2 p-4">
      <div className={`
        font-bold mb-2 px-3 py-1 rounded-full
        ${isCurrentPlayer 
          ? 'bg-yellow-500 text-black' 
          : 'bg-gray-800 text-white'
        }
      `}>
        {playerName}
        {isCurrentPlayer && <span className="ml-2 animate-pulse">▶</span>}
      </div>
      
      <div className="flex flex-wrap justify-center gap-1 min-h-[140px]">
        {cards.map((card, index) => {
          const isSelected = selectedCards.includes(index.toString());
          const isHovered = hoveredCard === index;
          
          return (
            <div 
              key={index}
              className={`
                transition-all duration-200
                ${isSelected ? 'transform -translate-y-4' : ''}
                ${isHovered && !isSelected ? 'transform -translate-y-2' : ''}
              `}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <Card
                cardCode={card}
                isSelected={isSelected}
                onClick={() => onCardClick && onCardClick(index)}
                size="md"
                disabled={disabled}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Hand;