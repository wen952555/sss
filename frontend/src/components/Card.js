import React from 'react';

const Card = ({ card }) => {
  // 如果card是字符串，则解析花色和点数
  let imageUrl = '';
  if (card === 'back') {
    imageUrl = '/cards/back.png';
  } else {
    // 假设card的格式为 "10_of_clubs"
    imageUrl = `/cards/${card}.png`;
  }
  
  return (
    <div className="card">
      <img src={imageUrl} alt={card} />
    </div>
  );
};

export default Card;
