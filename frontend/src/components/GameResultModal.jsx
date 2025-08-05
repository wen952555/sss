import React from 'react';
import Card from './Card';
import './GameResultModal.css';

// 辅助组件：渲染一个玩家的金字塔牌组
const PlayerHandDisplay = ({ hand, playerName, isYou }) => {
  if (!hand || !hand.top || !hand.middle || !hand.bottom) {
    return <div className="player-hand-placeholder">等待牌局数据...</div>;
  }
  
  const lanes = [hand.top, hand.middle, hand.bottom];

  // 牌组宽度估算，用于居中对齐
  const cardWidthInModal = 50; // 在弹窗中卡牌的估算宽度
  const baseLaneWidth = hand.bottom.length * cardWidthInModal;

  return (
    <div className={`result-player-hand-wrapper ${isYou ? 'you' : ''}`}>
      <div className="result-player-name">{playerName}</div>
      <div className="result-hand-container">
        {lanes.map((laneCards, index) => {
          if (!laneCards) return null;
          
          const cardCountDifference = hand.bottom.length - laneCards.length;
          const paddingLeft = (cardCountDifference / 2) * cardWidthInModal;

          return (
            <div 
              key={index} 
              className="result-cards-row" 
              style={{ paddingLeft: `${paddingLeft}px` }}
            >
              {laneCards.map((card, cardIndex) => (
                <Card key={`${card.suit}-${card.rank}-${cardIndex}`} card={card} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GameResultModal = ({ result, onClose }) => {
  if (!result || !result.playerHand || !result.aiHands) { // 检查 aiHands 是否存在
    return null;
  }

  const totalScoreText = result.score > 0 ? `总分: +${result.score}` : `总分: ${result.score}`;
  const totalScoreClass = result.score > 0 ? 'win' : (result.score < 0 ? 'loss' : 'tie');
  
  // 将所有玩家手牌整合到一个数组中
  const allPlayerHands = [
    { name: '你', hand: result.playerHand, isYou: true },
    // 后端返回的 aiHands 是一个对象，key是玩家名，value是手牌
    ...Object.entries(result.aiHands).map(([name, hand]) => ({ name, hand, isYou: false }))
  ];

  return (
    <div className="modal-backdrop fullscreen-modal">
      <div className="modal-content result-modal-panel">
        <div className="modal-top-bar">
           <div className="modal-title">比牌结果</div>
           <div className={`total-score ${totalScoreClass}`}>{totalScoreText}</div>
        </div>
        
        {/* 核心修改：使用网格布局展示所有玩家的牌组 */}
        <div className="all-players-hands-grid">
          {allPlayerHands.map((player, index) => (
            <PlayerHandDisplay 
              key={index}
              playerName={player.name}
              hand={player.hand}
              isYou={player.isYou}
            />
          ))}
        </div>
        
        <button onClick={onClose} className="close-button">返回大厅</button>
      </div>
    </div>
  );
};

export default GameResultModal;