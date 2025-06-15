// frontend_react/src/components/Card.js
import React from 'react';
import './Card.css'; // 创建对应的CSS文件

const Card = ({ card, isFaceDown = false, onClick, style }) => {
  if (!card && !isFaceDown) {
    return <div className="card-placeholder" style={style}></div>;
  }
  
  const cardImage = card ? `/assets/cards/${card.image}` : '/assets/cards/back.svg'; // 假设有张牌背图片 back.svg
  const altText = card ? card.name : 'Card Back';

  return (
    <div className={`card ${isFaceDown ? 'face-down' : ''}`} onClick={onClick} style={style} title={altText}>
      <img src={process.env.PUBLIC_URL + cardImage} alt={altText} />
    </div>
  );
};

export default Card;
