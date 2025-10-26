import React from 'react';
import GameResultModal4P from './GameResultModal4P';
import GameResultModal8P from './GameResultModal8P';

const GameResultModal = ({ result, onClose, onPlayAgain, gameType, user }) => {
  if (!result || !result.players) return null;

  const playerCount = result.players.length;

  if (playerCount <= 4) {
    return <GameResultModal4P result={result} onClose={onClose} onPlayAgain={onPlayAgain} gameType={gameType} user={user} />;
  } else {
    return <GameResultModal8P result={result} onClose={onClose} onPlayAgain={onPlayAgain} gameType={gameType} user={user} />;
  }
};

export default GameResultModal;
