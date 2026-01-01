import React, { useState } from 'react';

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

export default function Game() {
  const [hand, setHand] = useState([]);

  const drawCards = () => {
    // 模拟发牌逻辑（正式环境应从后端获取）
    const deck = [];
    SUITS.forEach(s => VALUES.forEach(v => deck.push(`${v}_of_${s}.svg`)));
    const shuffled = deck.sort(() => 0.5 - Math.random()).slice(0, 13);
    setHand(shuffled);
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <button 
        onClick={drawCards} 
        style={{ fontSize: '18px', padding: '10px 30px', background: '#27ae60', color: 'white' }}
      >
        开始洗牌
      </button>

      <div style={{ marginTop: '30px' }}>
        <h4>我的手牌 (13张)</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', 
          gap: '10px',
          background: 'rgba(255,255,255,0.1)',
          padding: '15px',
          borderRadius: '10px'
        }}>
          {hand.map((card, index) => (
            <div key={index}>
              <img 
                src={`/cards/${card}`} 
                alt={card} 
                style={{ width: '100%', borderRadius: '4px', boxShadow: '2px 2px 5px rgba(0,0,0,0.5)' }} 
                onError={(e) => e.target.src = '/cards/black_joker.svg'} 
              />
            </div>
          ))}
        </div>
      </div>

      {hand.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <p>（注：此处仅展示牌面，比牌算法由后端 game_logic.php 处理）</p>
        </div>
      )}
    </div>
  );
}