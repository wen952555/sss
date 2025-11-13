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

  // 获取卡片文件名（确保有.svg扩展名）
  const getCardFilename = (card) => {
    let filename;
    
    if (typeof card === 'object') {
      filename = card.filename;
    } else {
      filename = card;
    }
    
    // 确保文件名有.svg扩展名
    if (filename && !filename.endsWith('.svg')) {
      filename = filename + '.svg';
    }
    
    return filename;
  };

  // 获取卡片显示名称
  const getCardDisplay = (card) => {
    if (typeof card === 'object') {
      return card.display || card.filename;
    }
    return card;
  };

  const cardFilename = getCardFilename(card);
  const cardDisplay = getCardDisplay(card);

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
      title={cardDisplay}
    >
      <img 
        src={`/cards/${cardFilename}`} 
        alt={cardDisplay}
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
              ${cardDisplay}
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