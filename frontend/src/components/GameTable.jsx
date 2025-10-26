import React from 'react';
import PlayerBanner from './PlayerBanner';
import CardLanes from './CardLanes';
import ActionsPanel from './ActionsPanel';
import GameResultModal from './GameResultModal';
import './GameTable.css';

const GameTable = ({
  gameType,
  title,
  players,
  user,
  topLane,
  middleLane,
  bottomLane,
  unassignedCards,
  selectedCards,
  LANE_LIMITS,
  playerState,
  isGameInProgress,
  isLoading,
  gameResult,
  errorMessage,
  isOnline,
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

  return (
    <div className="game-table-container">
      <PlayerBanner
        onBackToLobby={onBackToLobby}
        title={title}
        isOnline={isOnline}
        user={user}
      />

      <CardLanes
        unassignedCards={unassignedCards}
        topLane={topLane}
        middleLane={middleLane}
        bottomLane={bottomLane}
        onCardClick={onCardClick}
        onLaneClick={onLaneClick}
        selectedCards={selectedCards}
        LANE_LIMITS={LANE_LIMITS}
      />

      {errorMessage && <p className="error-text">{errorMessage}</p>}

      <ActionsPanel
        playerState={playerState}
        isGameInProgress={isGameInProgress}
        isLoading={isLoading}
        isReady={isReady}
        onReady={onReady}
        onAutoSort={onAutoSort}
        onConfirm={onConfirm}
        isConfirmDisabled={isConfirmDisabled}
      />

      {gameResult && <GameResultModal result={gameResult} onClose={onCloseResult} onPlayAgain={onPlayAgain} gameType={gameType} isTrial={gameType === 'trial'} user={user} />}
    </div>
  );
};

export default GameTable;
