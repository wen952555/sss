import React from 'react';
import Card from './Card';
import './GameResultModal.css';

// 渲染单个玩家手牌
const PlayerHandDisplay = ({ hand }) => {
  const lanes = [hand.top, hand.middle, hand.bottom];
  return (
    <div className="result-hand-container">
      {lanes.map((laneCards, idx) => (
        <div key={idx} className="result-cards-row">
          {laneCards.map((card, cardIdx) => (
            <Card key={cardIdx} card={card} />
          ))}
        </div>
      ))}
    </div>
  );
};

const GameResultModal = ({ result, onClose }) => {
  if (!result || !result.players) return null;

  // 田字型布局：2行2列
  return (
    <div className="modal-backdrop">
      <div className="modal-content result-modal-content" style={{ maxWidth: '650px' }}>
        <div className="modal-top-bar">
          <button className="modal-quit-btn" onClick={onClose}>退出</button>
          <div className="modal-title">比牌结果</div>
        </div>
        <div className="game-result-grid">
          {result.players.map((player, idx) => (
            <div className="game-result-grid-item" key={player.name}>
              <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '8px' }}>
                {player.name} <span style={{ color: '#27ae60' }}>{result.scores[idx]}</span>
              </div>
              <PlayerHandDisplay hand={player.hand} />
            </div>
          ))}
        </div>
        <button onClick={onClose} className="close-button">返回大厅</button>
      </div>
    </div>
  );
};

export default GameResultModal;
