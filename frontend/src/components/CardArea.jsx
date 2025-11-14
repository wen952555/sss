import React from 'react';
import Card from './Card';

const CardArea = ({ 
  title, 
  cards, 
  area, 
  onCardMove, 
  onCardClick,
  onAreaClick,
  gameStatus, 
  selectedCards 
}) => {
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

  const handleAreaClick = () => {
    if (gameStatus !== 'playing') return;
    onAreaClick(area);
  };

  const getAreaStyle = () => {
    const cardCount = cards.length;
    const requiredCount = area === 'head' ? 3 : 5;
    const isValid = cardCount === requiredCount;

    return {
      background: isValid ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.1)',
      border: isValid ? '2px solid #4CAF50' : '2px dashed rgba(255, 255, 255, 0.3)',
      cursor: gameStatus === 'playing' ? 'pointer' : 'default'
    };
  };

  // 检查卡片是否被选中
  const isCardSelected = (card) => {
    return selectedCards.some(selected => {
      const cardKey = `${area}-${typeof card === 'object' ? card.filename : card}`;
      return selected.cardKey === cardKey;
    });
  };

  return (
    <div
      className="card-area"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleAreaClick}
      style={getAreaStyle()}
    >
      <div className="area-header">
        <h4>{title}</h4>
        <span>
          {cards.length}/{area === 'head' ? 3 : 5}
          {cards.length === (area === 'head' ? 3 : 5) && ' ✓'}
        </span>
      </div>

      <div className="card-slot">
        {cards.map((card, index) => (
          <Card
            key={typeof card === 'object' ? card.filename : `${card}-${index}`}
            card={card}
            area={area}
            draggable={gameStatus === 'playing'}
            onClick={onCardClick}
            isSelected={isCardSelected(card)}
            gameStatus={gameStatus}
            index={index}
          />
        ))}
        {cards.length === 0 && (
          <div className="empty-area-hint">
            {gameStatus === 'playing' ? '点击选择此处作为目标区域' : '等待分配'}
          </div>
        )}
      </div>
    </div>
  );
};

export default CardArea;