import React from 'react';
import Lane from './Lane';
import GameResultModal from './GameResultModal';
import './Play.css'; // Using the new CSS file name

const GameTable = ({
  gameType,
  players,
  user,
  topLane,
  middleLane,
  bottomLane,
  selectedCards,
  LANE_LIMITS,
  playerState,
  isLoading,
  gameResult,
  errorMessage,
  onBackToLobby,
  onReady,
  isReady,
  onConfirm,
  onAutoSort,
  onCardClick,
  onLaneClick,
  onCloseResult,
  onPlayAgain,
}) => {
  const isConfirmDisabled = isLoading ||
    playerState !== 'arranging' ||
    topLane.length !== LANE_LIMITS.top ||
    middleLane.length !== LANE_LIMITS.middle ||
    bottomLane.length !== LANE_LIMITS.bottom;

  const renderPlayerSeat = (p) => {
    const isMe = p.id === user.id;
    const playerClass = `player-seat ${isMe ? 'me' : ''} ${p.is_ready ? 'ready' : ''}`;
    const displayName = isMe ? '你' : `玩家${p.phone.slice(-4)}`;

    let statusText = '等待中...';
    if (playerState === 'waiting') {
      statusText = p.is_ready ? '已准备' : '未准备';
    } else if (playerState === 'arranging') {
      statusText = '理牌中...';
    } else if (playerState === 'submitted') {
      statusText = p.has_submitted ? '已提交' : '理牌中...';
    }

    return (
      <div key={p.id} className={playerClass}>
        <div className="player-name">{displayName}</div>
        <div className="player-status">{statusText}</div>
      </div>
    );
  };

  const renderPaiDun = (cards, area) => {
    return (
      <div className="pai-dun-row" onClick={() => onLaneClick(area)}>
        <div className="pai-dun-cards-wrapper">
          {cards.length === 0 && playerState === 'arranging' &&
            <div className="pai-dun-placeholder">请放牌</div>
          }
          <div className="pai-dun-cards-container">
            {cards.map((card, idx) => {
              if (!card || !card.key) return null;
              // The card object only contains a 'key' property. We must parse it.
              const parts = card.key.split('_of_');
              const rank = parts[0];
              const suit = parts[1];

              const RANK_MAP = {
                'A': 'ace', 'K': 'king', 'Q': 'queen', 'J': 'jack',
                'a': 'ace', 'k': 'king', 'q': 'queen', 'j': 'jack'
              };
              const rankName = RANK_MAP[rank] || rank;
              const cardName = `${rankName}_of_${suit}`;

              return (
                <img
                  key={card.key}
                  src={`/cards/${cardName}.svg`}
                  alt={cardName}
                  className={`card-img ${selectedCards.some(c => c.key === card.key) ? 'selected' : ''}`}
                  style={{ zIndex: idx }}
                  onClick={(e) => { e.stopPropagation(); onCardClick(card); }}
                  draggable={false}
                />
              );
            })}
          </div>
        </div>
        <div className="pai-dun-label">
          {area === 'top' ? '头道' : area === 'middle' ? '中道' : '尾道'} ({cards.length})
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <div className="game-content">
        <div className="top-bar">
          <button className="btn btn-back" onClick={onBackToLobby}>&lt; 退出房间</button>
          <div className="score-display">
            <span role="img" aria-label="coin" className="coin-icon">🪙</span>
            积分: {user?.points ?? 'N/A'}
          </div>
        </div>

        <div className="player-seats-container">
          {players.map(renderPlayerSeat)}
        </div>

        {playerState === 'arranging' || playerState === 'submitted' ? (
          <div className="pai-dun-area">
            {renderPaiDun(topLane, 'top')}
            {renderPaiDun(middleLane, 'middle')}
            {renderPaiDun(bottomLane, 'bottom')}
          </div>
        ) : (
          <div className="waiting-area">
            <p>等待所有玩家准备开始游戏...</p>
          </div>
        )}

        <div className="message-display">{errorMessage}</div>

        <div className="action-buttons-container">
          {playerState === 'waiting' && (
            <button
              onClick={onReady}
              className="btn btn-action"
              disabled={isLoading}
            >
              {isReady ? '取消准备' : '准备'}
            </button>
          )}
          {(playerState === 'arranging' || playerState === 'submitted') && (
            <>
              <button
                onClick={onAutoSort}
                className="btn btn-action"
                disabled={isLoading || playerState !== 'arranging'}
              >
                智能理牌
              </button>
              <button
                onClick={onConfirm}
                disabled={isConfirmDisabled}
                className="btn btn-action btn-compare"
              >
                {playerState === 'submitted' ? '等待开牌' : '确认比牌'}
              </button>
            </>
          )}
        </div>

        {gameResult && <GameResultModal result={gameResult} onClose={onCloseResult} onPlayAgain={onPlayAgain} gameType={gameType} user={user} />}
      </div>
    </div>
  );
};

export default GameTable;
