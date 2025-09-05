import React from 'react';
import Card from './Card';
import Lane from './Lane';
import GameResultModal from './GameResultModal';
import './GameTable.css';

const GameTable = ({
  gameType,
  title,
  players,
  user,
  autoPlayRounds,
  topLane,
  middleLane,
  bottomLane,
  unassignedCards,
  selectedCards,
  LANE_LIMITS,
  playerState,
  isLoading,
  gameResult,
  errorMessage,
  onBackToLobby,
  onReady,
  onConfirm,
  onAutoSort,
  onAutoPlay,
  onCardClick,
  onLaneClick,
  onCloseResult,
  onPlayAgain,
  turnTimeLeft,
}) => {
  const renderPlayerName = (p) => {
    if (String(p.id).startsWith('ai')) return p.phone;
    if (p.id === user.id) return '你';
    return `玩家${p.phone.slice(-4)}`;
  };

  const me = players.find(p => p.id === user.id);
  const myReadyState = me ? me.is_ready : false;
  const isAutoPlaying = autoPlayRounds > 0;

  return (
    <div className="game-table-container">
      <div className="game-table-header">
        <button onClick={onBackToLobby} className="table-action-btn back-btn">&larr; 退出</button>
        <div className="game-table-title">{title}</div>
      </div>
      <div className="players-status-banner">
        <span className="player-name-list">
          {players.map((p) => (
            <span key={p.id} className={playerState === 'arranging' ? 'arranging-state' : (p.is_ready ? 'ready-state' : '')}>
              {renderPlayerName(p)}
            </span>
          ))}
        </span>
      </div>

      {unassignedCards && unassignedCards.length > 0 && (
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
          <button className="table-action-btn confirm-btn" onClick={onReady}>
            {myReadyState ? '取消准备' : '点击准备'}
          </button>
        )}
        {playerState === 'arranging' && (
          <>
            <div className="timer-container">
              <span className="timer-text">{turnTimeLeft}s</span>
            </div>
            <button onClick={onAutoSort} className="table-action-btn sort-btn" disabled={isLoading || isAutoPlaying}>智能理牌</button>
            <button onClick={onAutoPlay} className="table-action-btn auto-manage-btn" disabled={isLoading}>
              {isAutoPlaying ? `托管中... (${autoPlayRounds})` : '智能托管'}
            </button>
            <button onClick={onConfirm} disabled={isLoading || isAutoPlaying} className="table-action-btn confirm-btn">确认比牌</button>
          </>
        )}
        {playerState === 'submitted' && (
           <>
            <button className="table-action-btn sort-btn" disabled={true}>智能理牌</button>
            <button className="table-action-btn auto-manage-btn" disabled={true}>智能托管</button>
            <button className="table-action-btn confirm-btn" disabled={true}>等待开牌</button>
          </>
        )}
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={onCloseResult} onPlayAgain={onPlayAgain} gameType={gameType} isTrial={true} />}
    </div>
  );
};

export default GameTable;
