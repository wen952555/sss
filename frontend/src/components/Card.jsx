import React from 'react';

const Card = ({ card, area, draggable = true }) => {
  const handleDragStart = (e) => {
    if (!draggable) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('application/json', JSON.stringify({
      card,
      fromArea: area
    }));
  };

  const handleDragEnd = (e) => {
    // 拖拽结束处理
  };

  // 获取卡片文件名
  const getCardFilename = () => {
    if (typeof card === 'object' && card.filename) {
      return card.filename;
    }
    if (typeof card === 'string') {
      return card.endsWith('.svg') ? card : `${card}.svg`;
    }
    return card;
  };

  // 获取卡片显示文本
  const getCardDisplay = () => {
    if (typeof card === 'object' && card.display) {
      return card.display;
    }
    
    const filename = getCardFilename();
    if (filename && filename.includes('_of_')) {
      const cardName = filename.replace('.svg', '');
      const [value, suit] = cardName.split('_of_');
      
      const suitSymbols = {
        'clubs': '♣',
        'diamonds': '♦', 
        'hearts': '♥',
        'spades': '♠'
      };
      
      const valueMap = {
        'ace': 'A', 'king': 'K', 'queen': 'Q', 'jack': 'J',
        '10': '10', '9': '9', '8': '8', '7': '7', '6': '6',
        '5': '5', '4': '4', '3': '3', '2': '2'
      };
      
      return `${valueMap[value] || value}${suitSymbols[suit] || suit}`;
    }
    
    return filename || '?';
  };

  const filename = getCardFilename();
  const displayText = getCardDisplay();

  return (
    <div
      className="card"
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        cursor: draggable ? 'grab' : 'default',
        opacity: draggable ? 1 : 0.8
      }}
      title={displayText}
    >
      <img 
        src={`/cards/${filename}`} 
        alt={displayText}
        onError={(e) => {
          // 图片加载失败时显示替代样式
          console.log(`图片加载失败: /cards/${filename}`);
          e.target.style.display = 'none';
          const parent = e.target.parentNode;
          
          parent.innerHTML = `
            <div style="
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              background: white;
              color: #333;
              border-radius: 5px;
              border: 1px solid #ccc;
              font-size: 14px;
              font-weight: bold;
              text-align: center;
            ">
              ${displayText}
            </div>
          `;
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};

export default Card;