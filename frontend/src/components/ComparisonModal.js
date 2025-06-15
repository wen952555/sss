// frontend_react/src/components/ComparisonModal.js
import React from 'react';
import Card from './Card';
import './ComparisonModal.css';

const PlayerResultDisplay = ({ player }) => {
  if (!player || !player.arranged || !player.evalHands) {
    return (
      <div className="player-result-cell error-cell">
        <h4>{player?.name || '未知玩家'}</h4>
        <p>数据错误</p>
      </div>
    );
  }

  return (
    <div className="player-result-cell">
      <h4 className="player-name-modal">{player.name}</h4>
      <p className="player-total-score-modal">本局得分: {player.score}</p>
      
      {['tou', 'zhong', 'wei'].map(dunKey => {
        const dunLabelMap = { tou: '头道', zhong: '中道', wei: '尾道' };
        const dunHand = player.arranged[dunKey] || [];
        const dunEval = player.evalHands[dunKey];
        const dunHandName = dunEval?.name || "未评估";

        return (
          // Each dun section will now be a positioning context for its text
          <div key={dunKey} className="dun-section-modal-with-corner-text">
            <div className="dun-cards-container-modal"> {/* Wrapper for cards */}
              {dunHand.map(c => <Card key={c.id} card={c} />)}
            </div>
            <div className="dun-info-corner-modal"> {/* Text positioned at corner */}
              <span className="dun-title-corner">{dunLabelMap[dunKey]}:</span>
              <span className="dun-type-corner">{dunHandName}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ComparisonModal = ({ players, onClose }) => {
  if (!players || players.length === 0) return null;

  const displayPlayers = [...players];
  while (displayPlayers.length < 4 && displayPlayers.length > 0) {
    displayPlayers.push(null); 
  }

  return (
    <div className="comparison-modal-overlay-fullscreen">
      <div className="comparison-modal-content-fullscreen">
        <h2 className="comparison-modal-title">本局比牌结果</h2>
        <div className="players-grid-layout-modal">
          {displayPlayers.slice(0, 4).map((player, index) =>
            player ? (
              <PlayerResultDisplay key={player.id || `player-${index}`} player={player} />
            ) : (
              <div key={`empty-cell-${index}`} className="player-result-cell empty-player-cell"></div>
            )
          )}
        </div>
        <div className="comparison-modal-footer">
          <button onClick={onClose} className="continue-game-button">
            继续游戏
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
