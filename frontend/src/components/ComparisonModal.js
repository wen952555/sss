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
      <h4>{player.name}</h4>
      <p className="player-total-score">得分: {player.score}</p>
      <div className="dun-display-section">
        <span className="dun-label-modal">头道: {player.evalHands.tou?.name || "未评估"}</span>
        <div className="cards-area-modal">
          {(player.arranged.tou || []).map(c => <Card key={c.id} card={c} />)}
        </div>
      </div>
      <div className="dun-display-section">
        <span className="dun-label-modal">中道: {player.evalHands.zhong?.name || "未评估"}</span>
        <div className="cards-area-modal">
          {(player.arranged.zhong || []).map(c => <Card key={c.id} card={c} />)}
        </div>
      </div>
      <div className="dun-display-section">
        <span className="dun-label-modal">尾道: {player.evalHands.wei?.name || "未评估"}</span>
        <div className="cards-area-modal">
          {(player.arranged.wei || []).map(c => <Card key={c.id} card={c} />)}
        </div>
      </div>
    </div>
  );
};

const ComparisonModal = ({ players, onClose }) => {
  if (!players || players.length === 0) return null;

  // 确保至少有4个元素用于布局，如果玩家不够，用空的填充
  const displayPlayers = [...players];
  while (displayPlayers.length < 4) {
    displayPlayers.push(null); // 用null作为占位符
  }

  return (
    <div className="comparison-modal-overlay-fullscreen">
      <div className="comparison-modal-content-fullscreen">
        <h2 className="comparison-modal-title">本局比牌结果</h2>
        <div className="players-grid-2x2">
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
