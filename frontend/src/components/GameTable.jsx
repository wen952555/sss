import React from 'react';
import Card from './Card';
import Lane from './Lane';
import GameResultModal from './GameResultModal';
import './GameTable.css';

// This is a presentational component. It receives all state and handlers as props.
const GameTable = ({
  // Game Info
  gameType,
  title,
  players,
  user,

  // State
  topLane,
  middleLane,
  bottomLane,
  unassignedCards,
  selectedCards,
  LANE_LIMITS,
  playerState, // 'waiting', 'arranging', 'submitted'
  isGameInProgress,
  isLoading,
  gameResult,
  errorMessage,
  isOnline,

  // Handlers
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
  const renderPlayerName = (p) => {
    if (String(p.id).startsWith('ai')) return p.phone;
    if (p.id === user.id) return '你';
    return `玩家${p.phone.slice(-4)}`;
  };

  return (
    <div className="game-table-container">
      {!isOnline && (
        <div className="connection-status-overlay">
          <div className="spinner"></div>
          网络连接已断开，正在尝试重新连接...
        </div>
      )}
      <div className="game-table-header">
        <button onClick={onBackToLobby} className="table-action-btn back-btn">&larr; 退出</button>
        <div className="game-table-title">{title}</div>
        {user && <div className="user-points">积分: {user.points}</div>}
      </div>

      {unassignedCards.length > 0 && (
          <Lane title="待选牌" cards={unassignedCards} onCardClick={onCardClick} selectedCards={selectedCards} />
      )}

      <div className="lanes-container">
        <Lane title="头道" cards={topLane} onCardClick={onCardClick} onLaneClick={() => onLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
        <Lane title="中道" cards={middleLane} onCardClick={onCardClick} onLaneClick={() => onLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
        <Lane title="尾道" cards={bottomLane} onCardClick={onCardClick} onLaneClick={() => onLaneClick('bottom')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} isDisabled={LANE_LIMITS.bottom === 0} />
      </div>

      {errorMessage && <p className="error-text">{errorMessage}</p>}
      <div className="game-table-footer">
        {playerState === 'waiting' && (
          <button
            onClick={onReady}
            className={`table-action-btn ready-btn ${isReady ? 'is-ready' : ''}`}
            disabled={isLoading}
          >
            {isReady ? '取消准备' : '准备'}
          </button>
        )}
        {isGameInProgress && (
          <>
            <button
              onClick={onAutoSort}
              className="table-action-btn sort-btn"
              disabled={isLoading || playerState !== 'arranging'}
            >
              智能理牌
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading || playerState !== 'arranging'}
              className="table-action-btn confirm-btn"
            >
              {playerState === 'submitted' ? '等待开牌' : '确认比牌'}
            </button>
          </>
        )}
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={onCloseResult} onPlayAgain={onPlayAgain} gameType={gameType} isTrial={gameType === 'trial'} />}
    </div>
  );
};

export default GameTable;
