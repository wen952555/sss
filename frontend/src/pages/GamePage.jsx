import React, { useState, useEffect, useCallback, useRef } from 'react';
import PlayerHand from '../components/game/PlayerHand';
import './GamePage.css';
import ApiWorker from '../workers/api.worker.js?worker';

const POLLING_INTERVAL = 2000;

const GamePage = () => {
  const [game, setGame] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [playerId] = useState('player1'); // Hardcoded for this user
  const [error, setError] = useState(null);
  const worker = useRef(null);

  // Initialize worker
  useEffect(() => {
    worker.current = new ApiWorker();

    worker.current.onmessage = (event) => {
      const { success, action, data, error: workerError } = event.data;
      if (success) {
        switch (action) {
          case 'createGame':
            setGameId(data.game_id);
            break;
          case 'getGameState':
            if (data.game_state) {
              setGame(data.game_state);
            } else if (data.message) {
              setError(data.message);
              setGameId(null); // Stop polling on error
            }
            break;
          case 'playHand':
          case 'passTurn':
            // The getGameState polling will update the view
            break;
          case 'getAiMove':
            if (data.move) {
              // Re-use existing handlers to perform the AI's move
              if (data.move.action === 'play') {
                // We need the current turn from the game state to pass to handlePlay
                setGame(g => {
                  if(g && g.current_turn) handlePlay(data.move.cards, g.current_turn);
                  return g;
                });
              } else {
                 setGame(g => {
                  if(g && g.current_turn) handlePass(g.current_turn);
                  return g;
                });
              }
            }
            break;
          default:
            break;
        }
      } else {
        setError(workerError || '发生未知错误。');
      }
    };

    return () => {
      worker.current.terminate();
    };
  }, []); // Only run on mount and unmount

  const fetchGameState = useCallback((gid) => {
    if (!gid || !worker.current) return;
    worker.current.postMessage({
      action: 'getGameState',
      payload: { game: 'thirteen-cards', game_id: gid, player_id: playerId },
    });
  }, [playerId]);

  const createNewGame = useCallback(() => {
    if (!worker.current) return;
    setError(null);
    setGame(null);
    setGameId(null);
    worker.current.postMessage({
      action: 'createGame',
      payload: { game: 'thirteen-cards' },
    });
  }, []);

  const handlePlay = useCallback((selectedCards, pId = playerId) => {
    if (!gameId || !worker.current) return;
    if (pId === playerId && selectedCards.length === 0) return;
    setError(null);
    worker.current.postMessage({
      action: 'playHand',
      payload: { game: 'thirteen-cards', game_id: gameId, player_id: pId, cards: selectedCards },
    });
  }, [gameId, playerId]);

  const handlePass = useCallback((pId = playerId) => {
    if (!gameId || !worker.current) return;
    setError(null);
    worker.current.postMessage({
      action: 'passTurn',
      payload: { game: 'thirteen-cards', game_id: gameId, player_id: pId },
    });
  }, [gameId, playerId]);

  const triggerAiMove = useCallback((aiPlayerId) => {
    if (!gameId || !worker.current) return;
    console.log(`正在为 ${aiPlayerId} 生成AI走法...`);
    worker.current.postMessage({
      action: 'getAiMove',
      payload: { game: 'thirteen-cards', game_id: gameId, player_id: aiPlayerId },
    });
  }, [gameId]);


  useEffect(() => { createNewGame(); }, [createNewGame]);

  useEffect(() => {
    if (gameId) {
      fetchGameState(gameId); // Fetch initial state right away
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
  );
};

export default GamePage;
