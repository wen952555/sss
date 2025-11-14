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
  const [cardPositions, setCardPositions] = useState([]);

  // 计算卡片位置
  useEffect(() => {
    if (!slotRef.current || cards.length === 0) {
      setCardPositions([]);
      return;
    }

    const calculatePositions = () => {
      const slotWidth = slotRef.current.offsetWidth;
      const cardWidth = 100; // 卡片宽度
      const halfCardWidth = cardWidth / 2; // 半张牌宽度作为默认间距
      
      // 计算所需总宽度
      const requiredWidth = cards.length * cardWidth + (cards.length - 1) * halfCardWidth;
      
      let actualSpacing;
      if (requiredWidth > slotWidth) {
        // 如果总宽度超过容器，自适应缩小间距
        actualSpacing = (slotWidth - cards.length * cardWidth) / (cards.length - 1);
      } else {
        // 否则使用半张牌宽度作为间距
        actualSpacing = halfCardWidth;
      }
      
      // 计算每张牌的位置
      const positions = cards.map((_, index) => {
        return index * (cardWidth + actualSpacing);
      });
      
      setCardPositions(positions);
    };

    calculatePositions();

    // 监听窗口大小变化
    const handleResize = () => {
      calculatePositions();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [cards, slotRef]);

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

      <div 
        className="card-slot" 
        ref={slotRef}
      >
        {cards.map((card, index) => (
          <Card
            key={typeof card === 'object' ? card.filename : `${card}-${index}`}
            card={card}
            area={area}
            draggable={gameStatus === 'playing'}
            onClick={onCardClick}
            isSelected={isCardSelected(card)}
            gameStatus={gameStatus}
            position={cardPositions[index] || 0}
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