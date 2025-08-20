// --- Card.jsx：彻底自适应并去除边框/阴影 ---
import React from 'react';

const Card = ({ card, onClick, isSelected, style = {} }) => {
  if (!card || card.suit === 'joker') return null;
  const imageName = `${card.rank}_of_${card.suit}.svg`;
  const imagePath = `/cards/${imageName}`;

  // 响应式尺寸：最大宽110px，最小宽45px，高度自动
  const cardStyle = {
    width: 'min(15vw, 80px)',
    minWidth: '45px',
    maxWidth: '80px',
    height: 'auto',
    maxHeight: '120px',
    boxSizing: 'border-box',
    border: 'none',
    boxShadow: 'none',
    borderRadius: '6px',
    background: '#fff',
    padding: 0,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  return (
    <div
      className={`card${isSelected ? ' selected' : ''}${onClick ? ' clickable' : ''}`}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(card); } : undefined}
      style={cardStyle}
    >
      <img
        src={imagePath}
        alt={`${card.suit} ${card.rank}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
        draggable={false}
      />
    </div>
  );
};

export default Card;