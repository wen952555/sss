import React, { useState, useEffect } from 'react';
import * as mahjongLogic from '../logic/mahjong.js';
import Tile from '../components/mahjong/Tile.jsx';
import DiscardPile from '../components/mahjong/DiscardPile.jsx';
import './MahjongPage.css';

const MahjongPage = () => {
  const [hands, setHands] = useState({ 1: [], 2: [], 3: [], 4: [] });
  const [wall, setWall] = useState([]);
  const [discardPiles, setDiscardPiles] = useState({ 1: [], 2: [], 3: [], 4: [] });
  const [currentPlayer, setCurrentPlayer] = useState(1);

  const startNewGame = () => {
    const tileSet = mahjongLogic.createTileSet();
    const shuffledTiles = mahjongLogic.shuffleTiles(tileSet);
    const { player1, player2, player3, player4, wall: newWall } = mahjongLogic.dealTiles(shuffledTiles);

    // Sort hands for better visualization
    setHands({
      1: player1.sort((a, b) => a.id.localeCompare(b.id)),
      2: player2.sort((a, b) => a.id.localeCompare(b.id)),
      3: player3.sort((a, b) => a.id.localeCompare(b.id)),
      4: player4.sort((a, b) => a.id.localeCompare(b.id)),
    });

    setWall(newWall);
    setDiscardPiles({ 1: [], 2: [], 3: [], 4: [] });
    setCurrentPlayer(1);
  };

  // This function now only handles the human player's (Player 1) turn
  const handleDiscardTile = (tileToDiscard) => {
    if (currentPlayer !== 1 || wall.length === 0) {
      return; // Not player 1's turn or wall is empty
    }

    const player1Hand = hands[1];
    const newPlayer1Hand = player1Hand.filter(tile => tile.id !== tileToDiscard.id);

    const newDiscardPiles = { ...discardPiles };
    newDiscardPiles[1] = [...newDiscardPiles[1], tileToDiscard];

    const newWall = [...wall];
    const drawnTile = newWall.shift();

    const updatedHand = [...newPlayer1Hand, drawnTile].sort((a, b) => a.id.localeCompare(b.id));

    setHands({ ...hands, 1: updatedHand });
    setDiscardPiles(newDiscardPiles);
    setWall(newWall);

    // Pass the turn to the next player
    setCurrentPlayer(2);
  };

  // Start a new game when the component mounts
  useEffect(() => {
    startNewGame();
  }, []);

  // Effect to handle AI turns
  useEffect(() => {
    // If it's the human player's turn (or game is over), do nothing
    if (currentPlayer === 1 || wall.length === 0) {
      return;
    }

    // AI's turn
    const aiPlayerId = currentPlayer;

    const performTurn = () => {
      const currentHand = hands[aiPlayerId];
      const { updatedHand, updatedWall, discardedTile } = mahjongLogic.performAITurn(currentHand, wall);

      if (discardedTile) {
        // Update hands
        const newHands = { ...hands };
        newHands[aiPlayerId] = updatedHand;
        setHands(newHands);

        // Update discard pile
        const newDiscardPiles = { ...discardPiles };
        newDiscardPiles[aiPlayerId] = [...newDiscardPiles[aiPlayerId], discardedTile];
        setDiscardPiles(newDiscardPiles);

        // Update wall
        setWall(updatedWall);

        // Pass the turn to the next player
        setCurrentPlayer(currentPlayer % 4 + 1);
      }
    };

    // Use a timeout to make the AI turn feel more natural
    const timer = setTimeout(performTurn, 1000); // 1 second delay

    // Cleanup the timer if the component unmounts
    return () => clearTimeout(timer);

  }, [currentPlayer, hands, wall, discardPiles]); // Dependencies for the effect

  return (
    <div className="mahjong-page">
      <div className="game-header">
        <h1>麻将</h1>
        <button onClick={startNewGame} className="new-game-button">
          New Game
        </button>
      </div>

      <div className="game-board">
        <div className="center-area">
            <div className="wall-info">
              <p>{wall.length} tiles left in the wall.</p>
              <p>Current Turn: Player {currentPlayer}</p>
            </div>
        </div>

        {/* Player Areas */}
        <div className={`player-area player-1 ${currentPlayer === 1 ? 'active' : ''}`}>
          <h2>Your Hand (Player 1)</h2>
          <div className="hand-container">
            {hands[1].map(tile => (
              <Tile key={tile.id} tile={tile} onClick={handleDiscardTile} />
            ))}
          </div>
          <DiscardPile tiles={discardPiles[1]} />
        </div>

        <div className={`player-area player-2 ${currentPlayer === 2 ? 'active' : ''}`}>
          <h4>Player 2</h4>
          <div className="hand-container-hidden">13 tiles</div>
          <DiscardPile tiles={discardPiles[2]} />
        </div>

        <div className={`player-area player-3 ${currentPlayer === 3 ? 'active' : ''}`}>
          <h4>Player 3</h4>
          <div className="hand-container-hidden">13 tiles</div>
          <DiscardPile tiles={discardPiles[3]} />
        </div>

        <div className={`player-area player-4 ${currentPlayer === 4 ? 'active' : ''}`}>
          <h4>Player 4</h4>
          <div className="hand-container-hidden">13 tiles</div>
          <DiscardPile tiles={discardPiles[4]} />
        </div>
      </div>
    </div>
  );
};

export default MahjongPage;
