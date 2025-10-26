import React from 'react';
import GameResultModal from './GameResultModal';

const GameResultModalContainer = ({ result, onClose, onPlayAgain, gameType, user }) => {
  if (!result) return null;

  return (
    <GameResultModal result={result} onClose={onClose} onPlayAgain={onPlayAgain} gameType={gameType} isTrial={gameType === 'trial'} user={user} />
  );
};

export default GameResultModalContainer;
