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

  // 解析卡片信息为可读格式
  const parseCardInfo = (card) => {
    if (card && typeof card === 'object') {
      return {
        display: card.display || '',
        filename: card.filename || ''
      };
    }
    
    // 如果是字符串格式，解析文件名
    if (typeof card === 'string' && card.includes('_of_')) {
      const filename = card.endsWith('.svg') ? card : `${card}.svg`;
      const [value, suit] = filename.replace('.svg', '').split('_of_');
      
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
      
      return {
        display: `${valueMap[value] || value}${suitSymbols[suit] || suit}`,
        filename: filename
      };
    }
    
    return {
      display: card || '',
      filename: card || ''
    };
  };

  const cardInfo = parseCardInfo(card);

  if (!card) {
    return <div className="card empty"></div>;
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
      title={cardInfo.display}
    >
      <img 
        src={`/cards/${cardInfo.filename}`} 
        alt={cardInfo.display}
        onError={(e) => {
          // 图片加载失败时显示替代样式
          e.target.style.display = 'none';
          const parent = e.target.parentNode;
          
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
              font-size: 16px;
              text-align: center;
              padding: 5px;
              box-sizing: border-box;
              font-weight: bold;
            ">
              ${cardInfo.display}
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