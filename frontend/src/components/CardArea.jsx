import React, { useRef, useEffect, useState } from 'react';
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
  const slotRef = useRef(null);
  const [maxVisibleCards, setMaxVisibleCards] = useState(0);

  // 计算最大可见卡片数量
  useEffect(() => {
    if (!slotRef.current) return;

    const calculateMaxVisibleCards = () => {
      const slotWidth = slotRef.current.offsetWidth;
      const cardWidth = 100; // 卡片宽度
      const overlap = 50; // 每张牌遮挡50px（半张牌）
      
      // 计算最多能显示多少张牌而不溢出
      // 公式：总宽度 = 第一张牌完整宽度 + (n-1) * (100-50)
      const maxCards = Math.floor((slotWidth - cardWidth) / (cardWidth - overlap)) + 1;
      setMaxVisibleCards(Math.max(1, maxCards));
    };

    calculateMaxVisibleCards();

    // 监听窗口大小变化
    const handleResize = () => {
      calculateMaxVisibleCards();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    const cardKey = `${area}-${card.filename}`;
    return selectedCards.some(selected => selected.cardKey === cardKey);
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
          {cards.length > maxVisibleCards && ` (显示前${maxVisibleCards}张)`}
        </span>
      </div>

      <div className="card-slot" ref={slotRef}>
        {cards.slice(0, maxVisibleCards).map((card, index) => (
          <Card
            key={card.filename}
            card={card}
            area={area}
            draggable={gameStatus === 'playing'}
            onClick={onCardClick}
            isSelected={isCardSelected(card)}
            gameStatus={gameStatus}
            index={index}
            totalCards={Math.min(cards.length, maxVisibleCards)}
          />
        ))}
        {cards.length === 0 && (
          <div className="empty-area-hint">
            {gameStatus === 'playing' ? '点击选择此处作为目标区域' : '等待分配'}
          </div>
        )}
        {cards.length > maxVisibleCards && (
          <div className="more-cards-indicator">
            +{cards.length - maxVisibleCards}更多
          </div>
        )}
      </div>
    </div>
  );
};

export default CardArea;