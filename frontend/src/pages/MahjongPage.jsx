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
  const [winner, setWinner] = useState(null);
  const [drawnTile, setDrawnTile] = useState(null); // The 14th tile for the current player

  const startNewGame = () => {
    const tileSet = mahjongLogic.createTileSet();
    const shuffledTiles = mahjongLogic.shuffleTiles(tileSet);
    const { player1, player2, player3, player4, wall: newWall } = mahjongLogic.dealTiles(shuffledTiles);

    setHands({
      1: player1.sort((a, b) => a.id.localeCompare(b.id)),
      2: player2, 3: player3, 4: player4,
    });

    setWall(newWall);
    setDiscardPiles({ 1: [], 2: [], 3: [], 4: [] });
    setCurrentPlayer(1);
    setWinner(null);
    setDrawnTile(null);
  };

  // This function now handles discarding one of the 14 tiles
  const handleDiscardTile = (tileToDiscard) => {
    if (currentPlayer !== 1 || winner || !drawnTile) {
      return; // Not player 1's turn, game is over, or no tile has been drawn
    }

    // Combine hand and drawn tile, then remove the one to be discarded
    const fullHand = [...hands[1], drawnTile];
    const newHand = fullHand.filter(tile => tile.id !== tileToDiscard.id);

    const newDiscardPiles = { ...discardPiles };
    newDiscardPiles[1] = [...newDiscardPiles[1], tileToDiscard];

    setHands({ ...hands, 1: newHand.sort((a, b) => a.id.localeCompare(b.id)) });
    setDiscardPiles(newDiscardPiles);
    setDrawnTile(null); // Clear the drawn tile
    setCurrentPlayer(2);
  };

  // Effect to handle drawing a tile for the current player
  useEffect(() => {
    if (winner || wall.length === 0) return;

    const drawTile = () => {
        const newWall = [...wall];
        const tile = newWall.shift();
        setWall(newWall);

        if (currentPlayer === 1) {
            setDrawnTile(tile);
            const handWithDrawnTile = [...hands[1], tile];
            if (mahjongLogic.isWinningHand(handWithDrawnTile)) {
                setWinner(1);
            }
        } else {
            // AI Turn Logic
            const currentHand = hands[currentPlayer];
            const handWithDrawnTile = [...currentHand, tile];
            if (mahjongLogic.isWinningHand(handWithDrawnTile)) {
                setWinner(currentPlayer);
                setHands({ ...hands, [currentPlayer]: handWithDrawnTile });
                return;
            }

            // AI discards a tile
            const { updatedHand, discardedTile } = mahjongLogic.performAITurn(handWithDrawnTile, []);
            const newHands = { ...hands, [currentPlayer]: updatedHand };
            const newDiscardPiles = { ...discardPiles };
            newDiscardPiles[currentPlayer] = [...newDiscardPiles[currentPlayer], discardedTile];

            setHands(newHands);
            setDiscardPiles(newDiscardPiles);
            setCurrentPlayer(currentPlayer % 4 + 1);
        }
    };

    // Trigger draw for AI, but wait for human to discard
    if (currentPlayer !== 1) {
        const timer = setTimeout(drawTile, 1000);
        return () => clearTimeout(timer);
    } else if (!drawnTile) { // Human player's turn to draw
        drawTile();
    }

  }, [currentPlayer, winner, wall]); // Simplified dependencies

  useEffect(() => {
    startNewGame();
  }, []);

  return (
    <div className="mahjong-page">
      {winner && (
        <div className="winner-overlay">
          <div className="winner-message">
            <h2>{winner === 0 ? '流局!' : `玩家 ${winner} 获胜!`}</h2>
            <button onClick={startNewGame}>再玩一次</button>
          </div>
        </div>
      )}
      <div className="game-header">
        <h1>麻将</h1>
        <div>
          <button onClick={startNewGame} className="new-game-button">
            新游戏
          </button>
        </div>
      </div>

      <div className="game-board">
        <div className="center-area">
            <div className="wall-info">
              <p>牌墙剩余 {wall.length} 张</p>
              <p>当前回合: 玩家 {currentPlayer}</p>
            </div>
        </div>

        {/* Player Areas */}
        <div className={`player-area player-1 ${currentPlayer === 1 ? 'active' : ''}`}>
          <h2>你的手牌 (玩家 1)</h2>
          <div className="hand-container">
            {hands[1].map(tile => (
              <Tile key={tile.id} tile={tile} onClick={handleDiscardTile} />
            ))}
            {drawnTile && currentPlayer === 1 && <div className="drawn-tile-separator" />}
            {drawnTile && currentPlayer === 1 && (
              <Tile key={drawnTile.id} tile={drawnTile} onClick={handleDiscardTile} />
            )}
          </div>
          <DiscardPile tiles={discardPiles[1]} />
        </div>

        <div className={`player-area player-2 ${currentPlayer === 2 ? 'active' : ''}`}>
          <h4>玩家 2</h4>
          <div className="hand-container-hidden">13 张牌</div>
          <DiscardPile tiles={discardPiles[2]} />
        </div>

        <div className={`player-area player-3 ${currentPlayer === 3 ? 'active' : ''}`}>
          <h4>玩家 3</h4>
          <div className="hand-container-hidden">13 张牌</div>
          <DiscardPile tiles={discardPiles[3]} />
        </div>

        <div className={`player-area player-4 ${currentPlayer === 4 ? 'active' : ''}`}>
          <h4>玩家 4</h4>
          <div className="hand-container-hidden">13 张牌</div>
          <DiscardPile tiles={discardPiles[4]} />
        </div>
      </div>
    </div>
  );
};

export default MahjongPage;
