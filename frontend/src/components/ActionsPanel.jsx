import React from 'react';

const ActionsPanel = ({
  playerState,
  isGameInProgress,
  isLoading,
  isReady,
  onReady,
  onAutoSort,
  onConfirm,
  isConfirmDisabled,
}) => {
  return (
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
            disabled={isConfirmDisabled}
            className="table-action-btn confirm-btn"
          >
            {playerState === 'submitted' ? '等待开牌' : '确认比牌'}
          </button>
        </>
      )}
    </div>
  );
};

export default ActionsPanel;
