import React, { useState, useEffect } from 'react';
import PlayerHand from '../components/game/PlayerHand';
import './GamePage.css';

// Configuration
const API_BASE_URL = 'http://localhost/api/game.php';
const POLLING_INTERVAL = 2000; // 2 seconds

const GamePage = () => {
  const [game, setGame] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [playerId, setPlayerId] = useState('player1'); // Hardcoded for this user
  const [error, setError] = useState(null);

  // Function to create a new game
  const createNewGame = async () => {
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
  };

  // Function to fetch the game state
  const fetchGameState = async (gid) => {
    if (!gid) return;
    try {
      const response = await fetch(`${API_BASE_URL}?action=getGameState&game_id=${gid}&player_id=${playerId}`);
      const data = await response.json();
      if (data.success) {
        setGame(data.game_state);
      } else {
        if (response.status === 404) {
            setError(data.message);
            setGameId(null);
        }
      }
    } catch (err) {
      console.error('Error fetching game state:', err);
    }
  };

  // --- Action Handlers ---
  const handlePlay = async (selectedCards) => {
    if (!gameId || !playerId || selectedCards.length === 0) return;
    setError(null); // Clear previous errors
    try {
      const response = await fetch(`${API_BASE_URL}?action=playHand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, player_id: playerId, cards: selectedCards }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Invalid move.');
      }
      // Immediately fetch state to reflect the change
      fetchGameState(gameId);
    } catch (err) {
      setError('Failed to play hand. Server connection error.');
      console.error(err);
    }
  };

  const handlePass = async () => {
    if (!gameId || !playerId) return;
    setError(null); // Clear previous errors
    try {
      const response = await fetch(`${API_BASE_URL}?action=passTurn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, player_id: playerId }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Cannot pass.');
      }
      // Immediately fetch state to reflect the change
      fetchGameState(gameId);
    } catch (err) {
      setError('Failed to pass turn. Server connection error.');
      console.error(err);
    }
  };

  // Effect to create a game on initial load
  useEffect(() => {
    createNewGame();
  }, []);

  // Effect to poll for game state
  useEffect(() => {
    if (gameId) {
      fetchGameState(gameId);
      const interval = setInterval(() => fetchGameState(gameId), POLLING_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [gameId]);

  // Effect to clear error messages after a delay
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const renderOpponents = () => { /* ... (same as before) ... */ };

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
          {/* ... opponents rendering ... */}
          <div className="opponents-container">
            {Object.keys(game.players).map(pId => {
              if (pId === playerId) return null;
              return (
                <div key={pId} className={`opponent opponent-${pId.replace('player', '')}`}>
                  <h2>{pId}</h2>
                  <div className="card-placeholder">{game.players[pId].card_count} Cards</div>
                </div>
              );
            })}
          </div>

          <div className="trick-area">
            {/* Display the last played hand */}
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

          <div className="game-info">
            <p>Current Turn: <strong>{game.current_turn}</strong> {game.current_turn === playerId && "(Your Turn)"}</p>
          </div>

          <div className="player-hand-container">
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
