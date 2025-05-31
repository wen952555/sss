import React from 'react';

const Card = ({ filename }) => {
  // 在开发环境中使用本地路径，生产环境使用CDN或绝对路径
  const imagePath = process.env.NODE_ENV === 'development' 
    ? `/assets/cards/${filename}`
    : `https://xxx.9525.ip-ddns.com/assets/cards/${filename}`;
  
  return (
    <div className="playing-card">
      <img 
        src={imagePath} 
        alt={filename.replace('.svg', '')} 
        onError={(e) => {
          e.target.onerror = null;
          e.target.parentNode.innerHTML = 
            `<div class="card-fallback">${filename.replace('.svg', '')}</div>`;
        }}
      />
    </div>
  );
};

export default Card;
