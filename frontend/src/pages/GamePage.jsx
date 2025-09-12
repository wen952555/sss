import React, { useState, useEffect, useCallback } from 'react';
import PlayerHand from '../components/game/PlayerHand';
import './GamePage.css';

// Configuration
const API_BASE_URL = 'http://localhost/api/game.php';
const POLLING_INTERVAL = 2000;

const GamePage = () => {
  const [game, setGame] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [playerId] = useState('player1'); // Hardcoded for this user
  const [error, setError] = useState(null);

  const fetchGameState = useCallback(async (gid) => {
    if (!gid) return;
    try {
      const response = await fetch(`${API_BASE_URL}?action=getGameState&game_id=${gid}&player_id=${playerId}`);
      const data = await response.json();
      if (data.success) {
        setGame(data.game_state);
      } else if (response.status === 404) {
        setError(data.message);
        setGameId(null);
      }
    } catch (err) {
      console.error('Error fetching game state:', err);
    }
  }, [playerId]);

  const createNewGame = useCallback(async () => {
    try {
      setError(null);
      setGame(null);
      const response = await fetch(`${API_BASE_URL}?action=createGame`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setGameId(data.game_id);
      } else {
        setError(data.message || 'Failed to create game.');
      }
    } catch (err) {
      setError('Could not connect to the server. Is the backend running?');
      console.error(err);
    }
  }, []);

  const handlePlay = useCallback(async (selectedCards) => {
    if (!gameId || !playerId || selectedCards.length === 0) return;
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}?action=playHand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, player_id: playerId, cards: selectedCards }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Invalid move.');
      } else {
        fetchGameState(gameId); // Immediately fetch state to reflect the change
      }
    } catch (err) {
      setError('Failed to play hand. Server connection error.');
    }
  }, [gameId, playerId, fetchGameState]);

  const handlePass = useCallback(async () => {
    if (!gameId || !playerId) return;
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}?action=passTurn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, player_id: playerId }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Cannot pass.');
      } else {
        fetchGameState(gameId); // Immediately fetch state to reflect the change
      }
    } catch (err) {
      setError('Failed to pass turn. Server connection error.');
    }
  }, [gameId, playerId, fetchGameState]);

  useEffect(() => { createNewGame(); }, [createNewGame]);

  useEffect(() => {
    if (gameId) {
      const interval = setInterval(() => fetchGameState(gameId), POLLING_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [gameId, fetchGameState]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const renderOpponent = (pId) => {
    if (!game || !game.players[pId]) return null;
    return (
      <div className="opponent">
        <h2>{pId}</h2>
        <div className="card-placeholder">{game.players[pId].card_count} Cards</div>
      </div>
    );
  };

  const getOpponentIds = () => {
    if (!game || !game.player_ids) return { top: null, left: null, right: null };
    const playerIds = game.player_ids;
    const myIndex = playerIds.indexOf(playerId);
    if (myIndex === -1) return { top: null, left: null, right: null };

    return {
      left: playerIds[(myIndex + 3) % 4], // Swapped left and right for clockwise flow
      top: playerIds[(myIndex + 2) % 4],
      right: playerIds[(myIndex + 1) % 4],
    };
  }

  const opponents = getOpponentIds();

  return (
    <div className="game-page">
      <div className="game-header">
        <h1>Thirteen Cards</h1>
        <button onClick={createNewGame} className="new-game-button">New Game</button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {!game && !error && <div className="loading">Loading...</div>}

      {game && (
        <div className="game-board">
          <div className="opponent-top">{renderOpponent(opponents.top)}</div>
          <div className="opponent-left">{renderOpponent(opponents.left)}</div>
          <div className="opponent-right">{renderOpponent(opponents.right)}</div>

          <div className="center-area">
            {game.last_play && (
              <div className="last-play">
                <p>Last Play by {game.last_play.player_id}:</p>
                <div className="cards-display-mini">
                  {game.last_play.cards.map(card => (
                    <img key={card.name} src={`/ppp/${card.name}.svg`} alt={card.name} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="player-area">
             <PlayerHand
               initialHand={game.my_hand}
               onPlay={handlePlay}
               onPass={handlePass}
               isMyTurn={game.current_turn === playerId}
             />
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePage;
