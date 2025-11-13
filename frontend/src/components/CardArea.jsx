import React from 'react';
import Card from './Card';

const CardArea = ({ title, cards, area, maxCards, onCardMove, gameStatus }) => {
  const handleDrop = (e) => {
    e.preventDefault();
    if (gameStatus !== 'playing') return;

    const cardData = e.dataTransfer.getData('application/json');
    if (!cardData) return;

    try {
      const { card, fromArea } = JSON.parse(cardData);
      
      if (fromArea !== area) {
        onCardMove(card, fromArea, area);
      }
    } catch (error) {
      console.error('拖拽数据解析错误:', error);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (gameStatus === 'playing') {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const getAreaStyle = () => {
    const isFull = cards.length >= maxCards;
    const isValid = cards.length === maxCards;
    
    return {
      background: isValid ? 'rgba(76, 175, 80, 0.1)' : 
                  isFull ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 255, 255, 0.1)',
      border: isValid ? '2px solid #4CAF50' : 
              isFull ? '2px solid #FFC107' : '2px dashed rgba(255, 255, 255, 0.3)'
    };
  };

  return (
    <div 
      className="card-area"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={getAreaStyle()}
    >
      <div className="area-header">
        <h4>{title}</h4>
        <span>
          {cards.length}/{maxCards}
          {cards.length === maxCards && ' ✓'}
        </span>
      </div>
      
      <div className="card-slot">
        {cards.map((card, index) => (
          <Card
            key={typeof card === 'object' ? card.filename : `${card}-${index}`}
            card={card}
            area={area}
            draggable={gameStatus === 'playing'}
          />
        ))}
        {cards.length === 0 && (
          <div style={{ 
            color: 'rgba(255,255,255,0.5)', 
            textAlign: 'center', 
            width: '100%',
            padding: '20px'
          }}>
            {gameStatus === 'playing' ? '拖放扑克牌到此处' : '等待分配'}
          </div>
        )}
      </div>
    </div>
  );
};

export default CardArea;