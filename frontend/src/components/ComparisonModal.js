// frontend_react/src/components/ComparisonModal.js
import React from 'react';
import Card from './Card';
import './ComparisonModal.css'; // Ensure this CSS is updated

const PlayerResultDisplay = ({ player }) => {
  if (!player || !player.arranged || !player.evalHands) {
    return (
      <div className="player-result-cell-v4 error-cell-v4"> {/* Versioning class names */}
        <h4>{player?.name || '未知玩家'}</h4>
        <p>数据错误</p>
      </div>
    );
  }

  const dunOrder = ['tou', 'zhong', 'wei'];
  // No dunLabelMap needed here as labels are not shown in this compact stacked view per image

  return (
    <div className="player-result-cell-v4">
      <h4 className="player-name-modal-v4">{player.name}</h4>
      <p className="player-total-score-modal-v4">本局得分: {player.score}</p>
      
      <div className="all-duns-compact-v4"> {/* Compact container for all duns */}
        {dunOrder.map(dunKey => {
          const dunHand = player.arranged[dunKey] || [];
          // const dunEval = player.evalHands[dunKey]; //牌型名称不在此处显示
          // const dunHandName = dunEval?.name || "未评估";

          return (
            <div key={dunKey} className="single-dun-stacked-cards-v4"> {/* Only cards, stacked */}
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

  // Prepare players for 2x2 layout, filling with placeholders if necessary
  const PADDING_PLAYER_COUNT = 4;
  const displayablePlayers = [...players];
  while (displayablePlayers.length < PADDING_PLAYER_COUNT && displayablePlayers.length > 0) {
    displayablePlayers.push(null); // Placeholder for empty slots in the grid
  }
  // Ensure we only try to render up to 4, even if more are passed (shouldn't happen for 4-player game)
  const finalPlayersToDisplay = displayablePlayers.slice(0, PADDING_PLAYER_COUNT);


  return (
    <div className="comparison-modal-overlay-fullscreen">
      <div className="comparison-modal-content-fullscreen">
        <h2 className="comparison-modal-title">本局比牌结果</h2>
        
        {/* This container will be flex row on narrow, grid on wide */}
        <div className="players-comparison-area-v4">
            {/* Left Column (Players 0 and 1) */}
            <div className="player-column-v4">
                {finalPlayersToDisplay[0] ? <PlayerResultDisplay player={finalPlayersToDisplay[0]} /> : <div className="player-result-cell-v4 empty-player-cell-v4"></div>}
                {finalPlayersToDisplay[1] ? <PlayerResultDisplay player={finalPlayersToDisplay[1]} /> : <div className="player-result-cell-v4 empty-player-cell-v4"></div>}
            </div>
            {/* Right Column (Players 2 and 3) */}
            <div className="player-column-v4">
                {finalPlayersToDisplay[2] ? <PlayerResultDisplay player={finalPlayersToDisplay[2]} /> : <div className="player-result-cell-v4 empty-player-cell-v4"></div>}
                {finalPlayersToDisplay[3] ? <PlayerResultDisplay player={finalPlayersToDisplay[3]} /> : <div className="player-result-cell-v4 empty-player-cell-v4"></div>}
            </div>
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
