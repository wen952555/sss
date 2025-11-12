import React from 'react';

const CARD_HEIGHT = 88;
const CARD_WIDTH = Math.round(CARD_HEIGHT * 46 / 66);

export default function CardComparisonExtracted({ 
  show, 
  onClose, 
  players, 
  foulStates = [],
  scores = [] 
}) {
  if (!show) return null;

  const scale = 0.9;
  const cardW = CARD_WIDTH * scale;
  const cardH = CARD_HEIGHT * scale;

  const renderPaiDunCards = (cards) => {
    const paddingX = 16;
    const maxWidth = 420 - 2 * paddingX - 70;
    let overlap = Math.floor(cardW / 3);
    
    if (cards.length > 1) {
      const totalWidth = cardW + (cards.length - 1) * overlap;
      if (totalWidth > maxWidth) {
        overlap = Math.floor((maxWidth - cardW) / (cards.length - 1));
      }
    }
    
    let lefts = [];
    let startX = 0;
    for (let i = 0; i < cards.length; ++i) {
      lefts.push(startX + i * overlap);
    }
    
    return (
      <div style={{
        position: 'relative',
        height: cardH,
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        overflow: 'visible'
      }}>
        {cards.map((card, idx) => (
          <img
            key={card}
            src={`/cards/${card}.svg`}
            alt={card}
            className="card-img"
            style={{
              position: 'absolute',
              left: lefts[idx],
              top: (cardH - cardH) / 2,
              zIndex: idx,
              width: cardW,
              height: cardH,
              borderRadius: 5,
              background: '#fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
            draggable={false}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh',
      background: 'rgba(0,0,0,0.85)', 
      zIndex: 2000, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#185a30',
        borderRadius: 15,
        padding: 24,
        maxWidth: '90vw',
        maxHeight: '90vh',
        boxShadow: '0 8px 40px #0002',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 20,
        position: 'relative',
        overflow: 'auto'
      }}>
        {players.map((player, i) => (
          <div key={i} style={{ 
            textAlign: 'center', 
            padding: '15px',
            background: i === 0 ? 'rgba(35, 230, 122, 0.1)' : 'rgba(79, 140, 255, 0.1)',
            borderRadius: '10px',
            border: i === 0 ? '2px solid #23e67a' : '2px solid #4f8cff'
          }}>
            <div style={{ 
              fontWeight: 700, 
              color: i === 0 ? '#23e67a' : '#4f8cff', 
              marginBottom: 12,
              fontSize: '1.1rem'
            }}>
              {player.name}
              {foulStates[i] && (
                <span style={{ color: 'red', fontWeight: 800, marginLeft: 6 }}>
                  （倒水）
                </span>
              )}
              {scores[i] !== undefined && (
                <span style={{ marginLeft: 8 }}>（{scores[i]}分）</span>
              )}
            </div>
            
            {/* 头道 */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#c3e1d1', 
                marginBottom: 5,
                fontWeight: 600
              }}>
                头道
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {renderPaiDunCards(player.head || [])}
              </div>
            </div>
            
            {/* 中道 */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#c3e1d1', 
                marginBottom: 5,
                fontWeight: 600
              }}>
                中道
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {renderPaiDunCards(player.middle || [])}
              </div>
            </div>
            
            {/* 尾道 */}
            <div>
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#c3e1d1', 
                marginBottom: 5,
                fontWeight: 600
              }}>
                尾道
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {renderPaiDunCards(player.tail || [])}
              </div>
            </div>
          </div>
        ))}
        
        <button 
          style={{
            position: 'absolute', 
            right: 18, 
            top: 12, 
            background: 'transparent', 
            border: 'none', 
            fontSize: 28, 
            color: '#c3e1d1', 
            cursor: 'pointer',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background 0.2s'
          }} 
          onClick={onClose}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
          onMouseOut={(e) => e.target.style.background = 'transparent'}
        >
          ×
        </button>
      </div>
    </div>
  );
}