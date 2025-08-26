import React from 'react';
import Card from './Card';
import Lane from './Lane';
import GameResultModal from './GameResultModal';

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
  hasDealt,
  hasSubmittedHand,
  isLoading,
  gameResult,
  errorMessage,

  // Handlers
  onBackToLobby,
  onReady,
  onConfirm,
  onAutoSort,
  onCardClick,
  onLaneClick,
  onCloseResult,
}) => {
  const renderPlayerName = (p) => {
    if (String(p.id).startsWith('ai')) return p.phone;
    if (p.id === user.id) return '你';
    return `玩家${p.phone.slice(-4)}`;
  };

  return (
    <div className="game-table-container">
      <div className="game-table-header">
        <button onClick={onBackToLobby} className="table-action-btn back-btn">&larr; 退出</button>
        <div className="game-table-title">{title}</div>
      </div>
      <div className={`players-status-container ${players.length > 4 ? 'six-player' : ''}`}>
        {players.map(p => (
          <div key={p.id} className={`player-status ${p.id === user.id ? 'is-me' : ''} ${hasDealt ? 'is-ready' : ''}`}>
            <div className="player-avatar">{String(p.id).startsWith('ai') ? 'AI' : p.phone.slice(-2)}</div>
            <div className="player-info">
              <div className="player-name">{renderPlayerName(p)}</div>
              <div className="player-ready-text">{hasDealt ? (hasSubmittedHand ? '已提交' : '理牌中...') : (p.is_ready ? '已准备' : '未准备')}</div>
            </div>
          </div>
        ))}
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
        {!hasDealt ? (
          <button className="table-action-btn confirm-btn" onClick={onReady}>点击准备</button>
        ) : (
          <>
            <button onClick={onAutoSort} className="table-action-btn sort-btn" disabled={hasSubmittedHand}>智能理牌</button>
            <button className="table-action-btn auto-manage-btn" disabled={hasSubmittedHand}>智能托管</button>
            <button onClick={onConfirm} disabled={isLoading || hasSubmittedHand} className="table-action-btn confirm-btn">
              {hasSubmittedHand ? '等待开牌' : '确认比牌'}
            </button>
          </>
        )}
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={onCloseResult} gameType={gameType} isTrial={true} />}
    </div>
  );
};

export default GameTable;
