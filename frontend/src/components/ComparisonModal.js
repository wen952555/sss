// frontend_react/src/components/ComparisonModal.js
import React from 'react';
import Card from './Card';
import './ComparisonModal.css'; // Will use v9 styles

const PlayerResultDisplay = ({ player }) => {
  if (!player || !player.arranged || !player.evalHands) {
    return (
      <div className="player-result-cell-v9 error-cell-v9"> {/* Versioning */}
        <h4>{player?.name || '未知玩家'}</h4>
        <p>数据错误</p>
      </div>
    );
  }

  const dunOrder = ['tou', 'zhong', 'wei'];

  return (
    <div className="player-result-cell-v9">
      {/* Player Name and Score will be part of the 'tou' dun's display now */}
      
      <div className="all-duns-compact-v9">
        {dunOrder.map(dunKey => {
          const dunHand = player.arranged[dunKey] || [];
          const isTouDun = dunKey === 'tou';

          return (
            <div 
              key={dunKey} 
              className={`single-dun-container-v9 ${isTouDun ? 'tou-dun-special-layout' : ''}`}
            >
              <div className="dun-cards-stacked-v9">
                {dunHand.map((card) => (
                  <Card 
                    key={card.id} 
                    card={card} 
                  />
                ))}
              </div>
              {isTouDun && ( // Only for 'tou' dun, display player name and score to the right
                <div className="player-info-beside-tou-v9">
                  <h4 className="player-name-modal-v9">{player.name}</h4>
                  <span className="player-total-score-modal-v9">(得分: {player.score})</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ComparisonModal = ({ players, onClose, isLoading }) => {
  if (!players || players.length === 0) return null;

  const PADDING_PLAYER_COUNT = 4;
  const displayablePlayers = [...players];
  while (displayablePlayers.length < PADDING_PLAYER_COUNT && displayablePlayers.length > 0) {
    displayablePlayers.push(null);
  }
  const finalPlayersToDisplay = displayablePlayers.slice(0, PADDING_PLAYER_COUNT);

  return (
    <div className="comparison-modal-overlay-fullscreen">
      <div className="comparison-modal-content-fullscreen-v9"> {/* Versioned */}
        
        <div className="players-comparison-area-v9">
            <div className="player-column-v9">
                {finalPlayersToDisplay[0] ? <PlayerResultDisplay player={finalPlayersToDisplay[0]} /> : <div className="player-result-cell-v9 empty-player-cell-v9"></div>}
                {finalPlayersToDisplay[2] ? <PlayerResultDisplay player={finalPlayersToDisplay[2]} /> : <div className="player-result-cell-v9 empty-player-cell-v9"></div>}
            </div>
            <div className="player-column-v9">
                {finalPlayersToDisplay[1] ? <PlayerResultDisplay player={finalPlayersToDisplay[1]} /> : <div className="player-result-cell-v9 empty-player-cell-v9"></div>}
                {finalPlayersToDisplay[3] ? <PlayerResultDisplay player={finalPlayersToDisplay[3]} /> : <div className="player-result-cell-v9 empty-player-cell-v9"></div>}
            </div>
        </div>

        <div className="comparison-modal-footer-v9">
          <button 
            onClick={onClose} 
            className="continue-game-button-v9"
            disabled={isLoading}
          >
            {isLoading ? "正在准备牌局..." : "继续游戏"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
