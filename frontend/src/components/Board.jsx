import React from 'react';
import Game from '../pages/Game';

export default function Board({ user, onBack }) {
  return (
    <div>
      <button onClick={onBack}>Back to Lobby</button>
      <Game />
    </div>
  );
}
