import React, { useState } from 'react';
import Card from './Card';

const CardHand = ({ cards, onCardClick, selectedCards = [], onSelectCard }) => {
  const [selectMode, setSelectMode] = useState(false);

  const handleCardClick = (cardCode) => {
    if (selectMode && onSelectCard) {
      onSelectCard(cardCode);
    } else if (onCardClick) {
      onCardClick(cardCode);
    }
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
  };

  const isCardSelected = (cardCode) => {
    return selectedCards.includes(cardCode);
  };

  return (
    <div className="hand-area">
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: '10px',
        padding: '0 10px'
      }}>
        {selectMode && (
          <button 
            className="game-button"
            onClick={toggleSelectMode}
            style={{ 
              background: '#e67e22',
              fontSize: '0.8rem',
              padding: '8px 12px'
            }}
          >
            取消多选
          </button>
        )}
        {!selectMode && cards.length > 0 && (
          <button 
            className="game-button"
            onClick={toggleSelectMode}
            style={{ 
              background: '#3498db',
              fontSize: '0.8rem',
              padding: '8px 12px'
            }}
          >
            多选模式
          </button>
        )}
        <span style={{ color: 'white', fontSize: '0.9rem' }}>
          手牌: {cards.length}张
          {selectMode && ` (已选: ${selectedCards.length}张)`}
        </span>
      </div>
      
      <div style={{ display: 'flex', gap: '2px', flexWrap: 'nowrap' }}>
        {cards.map((card, index) => (
          <Card
            key={`${card}-${index}`}
            cardCode={card}
            onClick={handleCardClick}
            selected={isCardSelected(card)}
            size="normal"
          />
        ))}
      </div>
    </div>
  );
};

export default CardHand;