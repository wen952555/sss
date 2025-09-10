import React, { useState, useEffect } from 'react';
import * as mahjongLogic from '../logic/mahjong.js';
import Tile from '../components/mahjong/Tile.jsx';
import './MahjongPage.css';

const MahjongPage = () => {
  const [playerHand, setPlayerHand] = useState([]);
  const [wall, setWall] = useState([]);

  const startNewGame = () => {
    const tileSet = mahjongLogic.createTileSet();
    const shuffledTiles = mahjongLogic.shuffleTiles(tileSet);
    const { player1, wall: newWall } = mahjongLogic.dealTiles(shuffledTiles);

    // Simple sort for player's hand for better visualization
    const sortedHand = player1.sort((a, b) => a.id.localeCompare(b.id));

    setPlayerHand(sortedHand);
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
            <Tile key={tile.id} tile={tile} />
          ))}
        </div>
        <div className="wall-info">
          <p>{wall.length} tiles left in the wall.</p>
        </div>
      </div>
    </div>
  );
};

export default MahjongPage;
