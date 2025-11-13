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

  // 获取卡片显示名称
  const getCardDisplay = (card) => {
    if (card && typeof card === 'object') {
      return card.display || card.filename;
    }
    return card || '';
  };

  // 获取卡片文件名
  const getCardFilename = (card) => {
    if (card && typeof card === 'object') {
      return card.filename;
    }
    return card || '';
  };

  if (!card) {
    return <div className="card empty"></div>; // 或者其他占位符
  }

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
      title={getCardDisplay(card)}
    >
      <img 
        src={`/cards/${getCardFilename(card)}`} 
        alt={getCardDisplay(card)}
        onError={(e) => {
          // 图片加载失败时显示替代样式
          e.target.style.display = 'none';
          const parent = e.target.parentNode;
          
          // 解析卡片信息显示文本
          let displayText = getCardDisplay(card);
          if (typeof card === 'string' && card.includes('_of_')) {
            const [value, suit] = card.replace('.svg', '').split('_of_');
            const suitSymbols = {
              'clubs': '♣',
              'diamonds': '♦', 
              'hearts': '♥',
              'spades': '♠'
            };
            const valueMap = {
              'ace': 'A', 'king': 'K', 'queen': 'Q', 'jack': 'J'
            };
            displayText = `${valueMap[value] || value}${suitSymbols[suit] || suit}`;
          }
          
          parent.innerHTML = `
            <div style="
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: white;
              color: #333;
              border-radius: 5px;
              border: 1px solid #ccc;
              font-size: 10px;
              text-align: center;
              padding: 5px;
              box-sizing: border-box;
            ">
              <div style="font-weight: bold; margin-bottom: 2px;">${displayText}</div>
            </div>
          `;
        }}
      />
    </div>
  );
};

export default Card;