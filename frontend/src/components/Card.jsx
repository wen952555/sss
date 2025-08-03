import React from 'react';

const Card = ({ card }) => {
  // 根据牌的信息生成图片文件名
  // 大小王的suit为'joker', rank为 'red_joker' 或 'black_joker'
  const imageName = card.suit === 'joker' 
    ? `${card.rank}.svg` 
    : `${card.rank}_of_${card.suit}.svg`;
  
  const imagePath = `/cards/${imageName}`;
  
  return (
    <div className="card">
      <img src={imagePath} alt={imageName} />
    </div>
  );
};

export default Card;
