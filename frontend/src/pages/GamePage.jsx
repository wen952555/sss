import React, { useState } from 'react';
import GameResultModal from '../components/GameResultModal';

const GamePage = () => {
  const [showResult, setShowResult] = useState(false);

  // Mock data for demonstration
  const players = [
    { name: 'You', head: ['AH', 'KD', 'QC'], middle: ['JS', '10C', '9H', '8D', '7S'], tail: ['6C', '5H', '4D', '3S', '2C'] },
    { name: 'Player 2', head: ['KH', 'QD', 'JC'], middle: ['10S', '9C', '8H', '7D', '6S'], tail: ['5C', '4H', '3D', '2S', 'AC'] },
    { name: 'Player 3', head: ['QH', 'JD', '10C'], middle: ['9S', '8C', '7H', '6D', '5S'], tail: ['4C', '3H', '2D', 'AS', 'KC'] },
    { name: 'Player 4', head: ['JH', '10D', '9C'], middle: ['8S', '7C', '6H', '5D', '4S'], tail: ['3C', '2H', 'AD', 'KS', 'QC'] },
  ];

  const scores = [10, -5, 5, -10];
  const foulStates = [false, false, true, false];

  return (
    <div>
      <h1>Game Page</h1>
      <button onClick={() => setShowResult(true)}>Show Results</button>
      <GameResultModal
        show={showResult}
        players={players}
        scores={scores}
        foulStates={foulStates}
        onClose={() => setShowResult(false)}
      />
    </div>
  );
};

export default GamePage;
