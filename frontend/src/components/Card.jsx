import React from 'react';

const Card = ({ card, area, draggable = true, onClick, isSelected = false, gameStatus, index, totalCards }) => {
  const handleDragStart = (e) => {
    if (!draggable || gameStatus !== 'playing') {
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

  const handleClick = (e) => {
    e.stopPropagation(); // 阻止事件冒泡到牌墩区域
    if (gameStatus !== 'playing') return;
    onClick(card, area);
  };

  // 计算卡片的堆叠位置 - 按比例分布
  const getCardPosition = () => {
    if (totalCards <= 1) return { left: '0%' };
    
    // 计算每张牌的位置百分比
    // 总可用空间：100% - 5% (右边半张牌的空位)
    const availableSpace = 95; // 95%的宽度用于放置所有牌
    const positionPercent = (index / (totalCards - 1)) * availableSpace;
    
    return { left: `${positionPercent}%` };
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
  const cardPosition = getCardPosition();

  return (
    <div
      className={`card ${isSelected ? 'selected' : ''}`}
      draggable={draggable && gameStatus === 'playing'}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      style={{
        cursor: (draggable && gameStatus === 'playing') ? 'pointer' : 'default',
        opacity: (draggable && gameStatus === 'playing') ? 1 : 0.8,
        position: 'absolute',
        ...cardPosition
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
              background: ${isSelected ? '#FFD700' : 'white'};
              color: #333;
              border-radius: 8px;
              border: 2px solid ${isSelected ? '#FF6B6B' : '#ccc'};
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