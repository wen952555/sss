import React from 'react';
import './App.css';

function App() {
  // 定义扑克牌的花色和点数
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];

  // 生成一副52张的扑克牌
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }

  return (
    <div className="app">
      <h1>扑克牌展示</h1>
      <div className="card-container">
        {deck.map((card, index) => {
          // 根据规则生成图片文件名，例如: ace_of_spades.svg
          const imageName = `${card.rank}_of_${card.suit}.svg`;
          // 图片路径指向 /public/cards/ 目录
          const imagePath = `/cards/${imageName}`;
          
          return (
            <div key={index} className="card">
              <img src={imagePath} alt={`${card.rank} of ${card.suit}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
