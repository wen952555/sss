import React, { useState, useEffect, useCallback, useRef } from 'react';
import ApiWorker from '../workers/api.worker.js?worker';
import './MahjongPage.css';

const MahjongPage = () => {
    const [game, setGame] = useState(null);
    const [gameId, setGameId] = useState(null);
    const [playerId] = useState('player1');
    const [selectedTile, setSelectedTile] = useState(null);
    const [canWin, setCanWin] = useState(false);
    const [error, setError] = useState(null);
    const worker = useRef(null);

    const handleAction = useCallback((action, payload = {}) => {
        if (!gameId && !['createGame', 'getGameState'].includes(action)) return;
        const game_id_to_use = action === 'createGame' ? null : (payload.game_id || gameId);
        worker.current.postMessage({
            action,
            payload: { game: 'mahjong', game_id: game_id_to_use, player_id: playerId, ...payload },
        });
    }, [gameId, playerId]);

    useEffect(() => {
        worker.current = new ApiWorker();
        worker.current.onmessage = (event) => {
            const { success, action, data, error: workerError } = event.data;
            if (success) {
                setError(null);
                if (action === 'createGame') {
                    setGameId(data.game_id);
                    setCanWin(false);
                    handleAction('getGameState', { game_id: data.game_id });
                } else if (data.game_state) {
                    setGame(data.game_state);
                } else if (action === 'checkWin') {
                    setCanWin(data.can_win);
                } else {
                    handleAction('getGameState');
                }
                if (action === 'discardTile') setSelectedTile(null);
            } else {
                setError(workerError || `An error occurred during ${action}.`);
            }
        };

        createNewGame();
        return () => worker.current.terminate();
    }, []); // Removed handleAction from deps as it is now stable

    const createNewGame = useCallback(() => {
        setGame(null);
        setGameId(null);
        setCanWin(false);
        handleAction('createGame');
    }, [handleAction]);

    useEffect(() => {
        if (game && game.game_phase === 'playing' && game.winner === null) {
            const interval = setInterval(() => handleAction('checkWin'), 3000);
            return () => clearInterval(interval);
        }
    }, [game, handleAction]);

    const isMyTurn = game && game.current_turn === playerId;
    const playerHand = game ? game.hands[playerId] : [];

    if (!game) return <div className="loading"><h1>Mahjong</h1><p>Loading...</p></div>;

    if (game.winner) {
        return <div className="mahjong-page"><h1>{game.winner === playerId ? 'You Won!' : `${game.winner} has won!`}</h1><button onClick={createNewGame}>Play Again</button></div>;
    }

    return (
        <div className="mahjong-page">
            <h1>Mahjong ({game.game_id})</h1>
            <button onClick={createNewGame}>New Game</button>
            {error && <div className="error-message" onClick={() => setError(null)}>{error}</div>}

            <div className="mahjong-board">
                <div className="discard-pile">
                    <strong>Discards:</strong>
                    <div className="tiles">
                        {game.discards.map((t, i) => <img key={t.id + i} src={`/photo/${t.name}.svg`} alt={t.name} />)}
                    </div>
                </div>

                <div className="player-hand">
                    <h3>Your Hand ({playerHand.length} tiles)</h3>
                    <div className="tiles">
                        {playerHand.sort((a,b) => a.name.localeCompare(b.name)).map(t => (
                            <img
                                key={t.id}
                                src={`/photo/${t.name}.svg`}
                                alt={t.name}
                                className={selectedTile?.id === t.id ? 'selected' : ''}
                                onClick={() => setSelectedTile(t)}
                            />
                        ))}
                    </div>
                </div>

                <div className="action-buttons">
                    {isMyTurn && playerHand.length % 3 !== 2 && <button onClick={() => handleAction('drawTile')}>Draw</button>}
                    {isMyTurn && playerHand.length % 3 === 2 && selectedTile && <button onClick={() => handleAction('discardTile', { tile_id: selectedTile.id })}>Discard</button>}
                    {game.action_options[playerId]?.includes('pung') && <button onClick={() => handleAction('pung')}>Pung</button>}
                    {canWin && <button onClick={() => handleAction('win')} className="win-button">WIN!</button>}
                </div>
            </div>
        </div>
    );
};

export default MahjongPage;
