import React from 'react';

const PAI_DUN_HEIGHT = 133;
const CARD_HEIGHT = Math.round(PAI_DUN_HEIGHT * 0.94);
const CARD_WIDTH = Math.round(CARD_HEIGHT * 46 / 66);
const OUTER_MAX_WIDTH = 420;

export default function PaiDunArea({ 
  cards, 
  label, 
  area, 
  color = '#23e67a',
  selected = { area: '', cards: [] },
  onCardClick,
  onAreaClick,
  isReady = false
}) {
  const renderPaiDunCards = () => {
    const paddingX = 16;
    const maxWidth = OUTER_MAX_WIDTH - 2 * paddingX - 70;
    let overlap = Math.floor(CARD_WIDTH / 3);
    
    if (cards.length > 1) {
      const totalWidth = CARD_WIDTH + (cards.length - 1) * overlap;
      if (totalWidth > maxWidth) {
        overlap = Math.floor((maxWidth - CARD_WIDTH) / (cards.length - 1));
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
        height: PAI_DUN_HEIGHT,
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        overflow: 'visible'
      }}>
        {cards.map((card, idx) => {
          const isSelected = selected.area === area && selected.cards.includes(card);
          return (
            <img
              key={card}
              src={`/cards/${card}.svg`}
              alt={card}
              className="card-img"
              style={{
                position: 'absolute',
                left: lefts[idx],
                top: (PAI_DUN_HEIGHT - CARD_HEIGHT) / 2,
                zIndex: idx,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                borderRadius: 5,
                border: isSelected ? '2.5px solid #ff4444' : 'none',
                boxShadow: isSelected
                  ? '0 0 16px 2px #ff4444cc'
                  : 'none',
                cursor: isReady ? 'pointer' : 'not-allowed',
                background: '#fff',
                transition: 'border .13s, box-shadow .13s'
              }}
              onClick={(e) => { 
                if (isReady && onCardClick) {
                  e.stopPropagation();
                  onCardClick(card, area, e);
                }
              }}
              draggable={false}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        borderRadius: 14,
        background: '#176b3c',
        minHeight: PAI_DUN_HEIGHT,
        height: PAI_DUN_HEIGHT,
        marginBottom: 20,
        position: 'relative',
        boxShadow: "0 4px 22px #23e67a44, 0 1.5px 5px #1a462a6a",
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        paddingLeft: 16,
        paddingRight: 70,
        cursor: isReady ? 'pointer' : 'default'
      }}
      onClick={() => { 
        if (isReady && onAreaClick) {
          onAreaClick(area);
        }
      }}
    >
      <div style={{
        flex: 1,
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        minWidth: 0,
      }}>
        {cards.length === 0 && (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            color: '#c3d6c6',
            fontSize: 18,
            fontWeight: 500,
            userSelect: 'none'
          }}>
            请放置
          </div>
        )}
        {renderPaiDunCards()}
      </div>
      
      <div
        style={{
          position: 'absolute',
          right: 16,
          top: 0,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          color: color,
          fontSize: 18,
          fontWeight: 600,
          pointerEvents: 'none',
          background: 'transparent',
          whiteSpace: 'nowrap'
        }}
      >
        {label}（{cards.length}）
      </div>
    </div>
  );
}