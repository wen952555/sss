import React, { useState, useEffect, useCallback } from 'react';
import ForceLandscape from '../components/common/ForceLandscape';
import BiddingControls from '../components/doudizhu/BiddingControls';
import DoudizhuPlayer from '../components/doudizhu/DoudizhuPlayer';
import './DoudizhuPage.css';

const API_BASE_URL = 'http://localhost/api/doudizhu.php';
const POLLING_INTERVAL = 2000;
const AI_PLAYER_IDS = ['player2', 'player3'];

const DoudizhuPage = () => {
  const [game, setGame] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [playerId] = useState('player1');
  const [error, setError] = useState(null);

  // --- API Functions and Effects (same as before) ---
  const fetchGameState = useCallback(async (gid) => { /* ... */ }, [playerId]);
  const createNewGame = useCallback(async () => { /* ... */ }, []);
  const handleBid = useCallback(async (bidAmount, pId = playerId) => { /* ... */ }, [gameId, playerId, fetchGameState]);
  useEffect(() => { createNewGame(); }, [createNewGame]);
  useEffect(() => { /* Polling */ }, [gameId, fetchGameState]);
  useEffect(() => { /* Error handling */ }, [error]);
  useEffect(() => { /* AI Bidding */ }, [game, gameId, handleBid]);

  // --- Render Logic ---
  if (!game) {
    return (
      <div className="doudizhu-page">
        <div className="game-header"><h1>斗地主</h1></div>
        {error && <div className="error-message">{error}</div>}
        {!error && <div className="loading">加载中...</div>}
      </div>
    );
  }

  const getPlayer = (pId) => ({
    name: pId,
    hand: game.hands[pId] || [], // Show all hands for debug
    isLandlord: game.landlord === pId,
    isMyTurn: game.game_phase === 'bidding' ? game.bidding.turn === pId : game.current_turn === pId,
  });

  return (
    <div className="doudizhu-page">
      <ForceLandscape />
      <div className="game-content-wrapper">
        <div className="doudizhu-board">

          <div className="player2-area">
            <DoudizhuPlayer {...getPlayer('player2')} />
          </div>

          <div className="kitty-area">
            {game.kitty.map((card, index) =>
              game.landlord ? // Show kitty if landlord is decided
              <img key={index} src={`/ppp/${card.name}.svg`} alt="kitty card" className="card-small" /> :
              <div key={index} className="kitty-card"></div>
            )}
          </div>

          <div className="player3-area">
            <DoudizhuPlayer {...getPlayer('player3')} />
          </div>

          <div className="center-info">
            {game.game_phase === 'bidding' && (
              <>
                <p>当前最高叫分: {game.bidding.highest_bid}分</p>
                <BiddingControls
                  currentBid={game.bidding.highest_bid}
                  isMyTurn={game.bidding.turn === playerId}
                  onBid={handleBid}
                />
              </>
            )}
             {game.game_phase === 'playing' && <p>轮到 {game.current_turn} 出牌</p>}
          </div>

          <div className="player1-area">
            <DoudizhuPlayer {...getPlayer('player1')} />
             {/* We will add playing controls here later */}
          </div>
        </div>
      </div>
    </div>
  );
};

// Full function definitions are omitted for brevity in this block
// They are assumed to be the same as the previous correct implementation
DoudizhuPage.prototype.fetchGameState = async function() {};
DoudizhuPage.prototype.createNewGame = async function() {};
DoudizhuPage.prototype.handleBid = async function() {};


export default DoudizhuPage;
