import React, { useState, useEffect, useCallback } from 'react';
import PlayerHand from '../components/game/PlayerHand';
import ForceLandscape from '../components/common/ForceLandscape';
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
      console.error('获取游戏状态时出错:', err);
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
        setError(data.message || '创建游戏失败。');
      }
    } catch (err) {
      setError('无法连接到服务器。后端服务是否已启动？');
      console.error(err);
    }
  }, []);

  const handlePlay = useCallback(async (selectedCards, pId = playerId) => {
    if (!gameId) return;
    // The player ID is now dynamic
    const effectivePlayerId = pId;

    if (effectivePlayerId === playerId && selectedCards.length === 0) return; // Human must select cards
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}?action=playHand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, player_id: effectivePlayerId, cards: selectedCards }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message || '无效的出牌。');
      } else {
        fetchGameState(gameId);
      }
    } catch (err) {
      setError('出牌失败，服务器连接错误。');
    }
  }, [gameId, playerId, fetchGameState]);

  const handlePass = useCallback(async (pId = playerId) => {
    if (!gameId) return;
    const effectivePlayerId = pId;
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}?action=passTurn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, player_id: effectivePlayerId }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message || '无法过牌。');
      } else {
        fetchGameState(gameId);
      }
    } catch (err) {
      setError('过牌失败，服务器连接错误。');
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

  // --- AI Turn Logic ---
  const triggerAiMove = useCallback(async (aiPlayerId) => {
    if (!gameId) return;
    console.log(`Triggering AI move for ${aiPlayerId}...`);
    try {
      const response = await fetch(`${API_BASE_URL}?action=getAiMove&game_id=${gameId}&player_id=${aiPlayerId}`);
      const data = await response.json();

      if (data.success && data.move) {
        // Execute the move returned by the AI
        if (data.move.action === 'play') {
          // We need to pass the full card objects, not just names.
          // This assumes the AI endpoint returns the full card objects.
          handlePlay(data.move.cards, aiPlayerId);
        } else {
          handlePass(aiPlayerId);
        }
      }
    } catch (err) {
      console.error('Error triggering AI move:', err);
    }
  }, [gameId, handlePlay, handlePass]);

  useEffect(() => {
    const AI_PLAYER_IDS = ['player2', 'player3', 'player4'];
    if (game && AI_PLAYER_IDS.includes(game.current_turn)) {
      const aiPlayerId = game.current_turn;
      const aiThinkTime = 1500;
      const timer = setTimeout(() => {
        triggerAiMove(aiPlayerId);
      }, aiThinkTime);
      return () => clearTimeout(timer);
    }
  }, [game, triggerAiMove]);

  const renderOpponent = (pId) => {
    if (!game || !game.players[pId]) return null;
    return (
      <div className="opponent">
        <h2>{pId}</h2>
        <div className="card-placeholder">{game.players[pId].card_count} 张牌</div>
      </div>
    );
  };

  const getOpponentIds = () => {
    if (!game || !game.player_ids) return { top: null, left: null, right: null };
    const playerIds = game.player_ids;
    const myIndex = playerIds.indexOf(playerId);
    if (myIndex === -1) return { top: null, left: null, right: null };

    return {
      left: playerIds[(myIndex + 3) % 4],
      top: playerIds[(myIndex + 2) % 4],
      right: playerIds[(myIndex + 1) % 4],
    };
  }

  const opponents = getOpponentIds();

  return (
    <div className="game-page">
      <ForceLandscape />
      <div className="game-content-wrapper">
        <div className="game-header">
          <h1>十三张</h1>
          <button onClick={createNewGame} className="new-game-button">新游戏</button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {!game && !error && <div className="loading">加载中...</div>}

        {game && (
          <div className="game-board">
            <div className="opponent-top">{renderOpponent(opponents.top)}</div>
            <div className="opponent-left">{renderOpponent(opponents.left)}</div>
            <div className="opponent-right">{renderOpponent(opponents.right)}</div>

            <div className="center-area">
              {game.last_play && (
                <div className="last-play">
                  <p>上一手牌 ({game.last_play.player_id}):</p>
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
    </div>
  );
};

export default GamePage;
