import React, { useState, useEffect } from 'react';
import * as gameLogic from '../logic/thirteen_cards';
import PlayerHand from '../components/game/PlayerHand';
import './GamePage.css';

const GamePage = () => {
  const [gameState, setGameState] = useState('new'); // 'new', 'playing', 'finished'
  const [playerHand, setPlayerHand] = useState([]);
  const [aiHand, setAiHand] = useState([]);

  const startNewGame = () => {
    const deck = gameLogic.createDeck();
    const shuffledDeck = gameLogic.shuffleDeck(deck);
    const { playerHand, aiHand } = gameLogic.dealCards(shuffledDeck);

    setPlayerHand(gameLogic.sortHand(playerHand));
    setAiHand(aiHand); // AI hand is not sorted for the player to see
    setGameState('playing');
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <h1>Thirteen Cards</h1>
        <button onClick={startNewGame} className="new-game-button">
          New Game
        </button>
      </div>

      {gameState === 'playing' && (
        <div className="game-board">
          <div className="hand-container ai-hand">
            <h2>AI Hand</h2>
            {/* We can't see the AI's cards yet */}
            <div className="card-placeholder">13 Cards</div>
          </div>

          <PlayerHand initialHand={playerHand} />
        </div>
      )}
    </div>
  );
};

export default GamePage;
