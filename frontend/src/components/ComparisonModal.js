// frontend_react/src/components/ComparisonModal.js
import React from 'react';
import Card from './Card';
import './ComparisonModal.css';

const PlayerResultDisplay = ({ player }) => {
  if (!player || !player.arranged || !player.evalHands) {
    return (
      <div className="player-result-cell-v6 error-cell-v6"> {/* Versioning class names */}
        <h4>{player?.name || '未知玩家'}</h4>
        <p>数据错误</p>
      </div>
    );
  }

  const dunOrder = ['tou', 'zhong', 'wei'];

  return (
    <div className="player-result-cell-v6">
      <div className="player-header-v6"> {/* New wrapper for name and score */}
        <h4 className="player-name-modal-v6">{player.name}</h4>
        <span className="player-total-score-modal-v6">(得分: {player.score})</span> {/* Score next to name */}
      </div>
      
      <div className="all-duns-compact-v6">
        {dunOrder.map(dunKey => {
          const dunHand = player.arranged[dunKey] || [];
          return (
            <div key={dunKey} className="single-dun-stacked-cards-v6">
              {dunHand.map((card) => (
                <Card 
                  key={card.id} 
                  card={card} 
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ComparisonModal = ({ players, onClose }) => {
  if (!players || players.length === 0) return null;

  const PADDING_PLAYER_COUNT = 4;
  const displayablePlayers = [...players];
  while (displayablePlayers.length < PADDING_PLAYER_COUNT && displayablePlayers.length > 0) {
    displayablePlayers.push(null);
  }
  const finalPlayersToDisplay = displayablePlayers.slice(0, PADDING_PLAYER_COUNT);

  return (
    <div className="comparison-modal-overlay-fullscreen">
      <div className="comparison-modal-content-fullscreen-v6">
        <h2 className="comparison-modal-title-v6">本局比牌结果</h2>
        
        <div className="players-comparison-area-v6">
            <div className="player-column-v6">
                {finalPlayersToDisplay[0] ? <PlayerResultDisplay player={finalPlayersToDisplay[0]} /> : <div className="player-result-cell-v6 empty-player-cell-v6"></div>}
                {finalPlayersToDisplay[2] ? <PlayerResultDisplay player={finalPlayersToDisplay[2]} /> : <div className="player-result-cell-v6 empty-player-cell-v6"></div>}
            </div>
            <div className="player-column-v6">
                {finalPlayersToDisplay[1] ? <PlayerResultDisplay player={finalPlayersToDisplay[1]} /> : <div className="player-result-cell-v6 empty-player-cell-v6"></div>}
                {finalPlayersToDisplay[3] ? <PlayerResultDisplay player={finalPlayersToDisplay[3]} /> : <div className="player-result-cell-v6 empty-player-cell-v6"></div>}
            </div>
        </div>

        <div className="comparison-modal-footer-v6">
          <button onClick={onClose} className="continue-game-button-v6">
            继续游戏
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
