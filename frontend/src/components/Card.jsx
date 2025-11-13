import React from 'react';

const Card = ({ card, area, draggable = true, onDoubleClick }) => {
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

  return (
    <div
      className="card"
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDoubleClick={onDoubleClick}
      style={{
        cursor: draggable ? 'grab' : 'default',
        opacity: draggable ? 1 : 0.8
      }}
      title={card.display}
    >
      <img 
        src={`/cards/${card.filename}`} 
        alt={card.display}
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
              font-size: 10px;
              text-align: center;
              padding: 5px;
              box-sizing: border-box;
            ">
              <div style="font-weight: bold; margin-bottom: 2px;">${card.value}</div>
              <div>of</div>
              <div style="margin-top: 2px;">${card.suit}</div>
            </div>
          `;
        }}
      />
    </div>
  );
};

export default Card;