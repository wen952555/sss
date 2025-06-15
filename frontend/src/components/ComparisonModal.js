// frontend_react/src/components/ComparisonModal.js
import React from 'react';
import Card from './Card';
import './ComparisonModal.css'; // Will use v8 styles

const PlayerResultDisplay = ({ player }) => {
  if (!player || !player.arranged || !player.evalHands) {
    return (
      <div className="player-result-cell-v8 error-cell-v8"> {/* Versioning class names */}
        <h4>{player?.name || '未知玩家'}</h4>
        <p>数据错误</p>
      </div>
    );
  }

  const dunOrder = ['tou', 'zhong', 'wei'];

  return (
    <div className="player-result-cell-v8">
      <div className="player-header-v8">
        <h4 className="player-name-modal-v8">{player.name}</h4>
        <span className="player-total-score-modal-v8">(得分: {player.score})</span>
      </div>
      
      <div className="all-duns-compact-v8">
        {dunOrder.map(dunKey => {
          const dunHand = player.arranged[dunKey] || [];
          return (
            <div key={dunKey} className="single-dun-stacked-cards-v8">
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
      <div className="comparison-modal-content-fullscreen-v8"> {/* Versioned */}
        
        <div className="players-comparison-area-v8">
            <div className="player-column-v8">
                {finalPlayersToDisplay[0] ? <PlayerResultDisplay player={finalPlayersToDisplay[0]} /> : <div className="player-result-cell-v8 empty-player-cell-v8"></div>}
                {finalPlayersToDisplay[2] ? <PlayerResultDisplay player={finalPlayersToDisplay[2]} /> : <div className="player-result-cell-v8 empty-player-cell-v8"></div>}
            </div>
            <div className="player-column-v8">
                {finalPlayersToDisplay[1] ? <PlayerResultDisplay player={finalPlayersToDisplay[1]} /> : <div className="player-result-cell-v8 empty-player-cell-v8"></div>}
                {finalPlayersToDisplay[3] ? <PlayerResultDisplay player={finalPlayersToDisplay[3]} /> : <div className="player-result-cell-v8 empty-player-cell-v8"></div>}
            </div>
        </div>

        <div className="comparison-modal-footer-v8">
          <button onClick={onClose} className="continue-game-button-v8">
            继续游戏
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
