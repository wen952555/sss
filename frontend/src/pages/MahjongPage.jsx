import React, { useState, useEffect } from 'react';
import * as mahjongLogic from '../logic/mahjong.js';
import Tile from '../components/mahjong/Tile.jsx';
import DiscardPile from '../components/mahjong/DiscardPile.jsx';
import './MahjongPage.css';

const MahjongPage = () => {
  const [playerHand, setPlayerHand] = useState([]);
  const [wall, setWall] = useState([]);
  const [discardPile, setDiscardPile] = useState([]);

  const startNewGame = () => {
    const tileSet = mahjongLogic.createTileSet();
    const shuffledTiles = mahjongLogic.shuffleTiles(tileSet);
    const { player1, wall: newWall } = mahjongLogic.dealTiles(shuffledTiles);

    // Simple sort for player's hand for better visualization
    const sortedHand = player1.sort((a, b) => a.id.localeCompare(b.id));

    setPlayerHand(sortedHand);
    setWall(newWall);
    setDiscardPile([]); // Reset discard pile
  };

  // Function to handle the player's turn (discard and draw)
  const handleDiscardTile = (tileToDiscard) => {
    // 1. Check if the wall is empty
    if (wall.length === 0) {
      console.log("No more tiles in the wall. Game is a draw.");
      return;
    }

    // 2. Remove the discarded tile from the player's hand
    const newPlayerHand = playerHand.filter(tile => tile.id !== tileToDiscard.id);

    // 3. Add the discarded tile to the discard pile
    const newDiscardPile = [...discardPile, tileToDiscard];

    // 4. Draw a new tile from the wall
    const newWall = [...wall];
    const drawnTile = newWall.shift(); // Takes the first tile from the wall

    // 5. Add the new tile to the player's hand and re-sort
    const updatedHand = [...newPlayerHand, drawnTile].sort((a, b) => a.id.localeCompare(b.id));

    // 6. Update the state
    setPlayerHand(updatedHand);
    setDiscardPile(newDiscardPile);
    setWall(newWall);
  };

  // Start a new game when the component mounts
  useEffect(() => {
    startNewGame();
  }, []);

  return (
    <div className="mahjong-page">
      <div className="game-header">
        <h1>麻将</h1>
        <button onClick={startNewGame} className="new-game-button">
          New Hand
        </button>
      </div>

      <div className="game-board">
        <h2>Your Hand</h2>
        <div className="hand-container">
          {playerHand.map(tile => (
            <Tile key={tile.id} tile={tile} onClick={handleDiscardTile} />
          ))}
        </div>

        <DiscardPile tiles={discardPile} />

        <div className="wall-info">
          <p>{wall.length} tiles left in the wall.</p>
        </div>
      </div>
    </div>
  );
};

export default MahjongPage;
