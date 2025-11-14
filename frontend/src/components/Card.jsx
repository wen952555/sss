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

  // 计算卡片的堆叠偏移量 - 优化版本
  const getCardOffset = () => {
    if (totalCards <= 1) return { left: 0 };
    
    // 计算每张牌的偏移量，让它们松散堆叠显示
    // 确保最后一张牌右边有半张牌的空间
    const cardWidth = 100; // 卡片宽度
    const maxCards = area === 'head' ? 3 : 5; // 该区域最大牌数
    const containerPadding = 20; // 容器内边距
    
    // 计算可用宽度（减去半张牌的空间）
    const availableWidth = `calc(100% - ${cardWidth / 2}px - ${containerPadding * 2}px)`;
    
    // 计算每张牌的偏移步长
    const step = `calc(${availableWidth} / ${Math.max(totalCards - 1, 1)})`;
    
    const left = `calc(${index} * ${step})`;
    
    return { left };
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
  const cardOffset = getCardOffset();

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
        ...cardOffset
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
