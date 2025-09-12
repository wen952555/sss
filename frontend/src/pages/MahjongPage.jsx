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
    const [concealedKongOptions, setConcealedKongOptions] = useState([]);

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
                setError(workerError || `在 ${action} 期间发生错误。`);
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

    useEffect(() => {
        if (game && game.hands[playerId]) {
            const counts = {};
            game.hands[playerId].forEach(tile => {
                counts[tile.name] = (counts[tile.name] || 0) + 1;
            });
            const kongs = Object.keys(counts).filter(name => counts[name] === 4);
            setConcealedKongOptions(kongs);
        }
    }, [game, playerId]);

    const isMyTurn = game && game.current_turn === playerId;
    const playerHand = game ? game.hands[playerId] : [];

    if (!game) return <div className="loading"><h1>麻将</h1><p>加载中...</p></div>;

    if (game.winner) {
        return <div className="mahjong-page"><h1>{game.winner === playerId ? '你赢了!' : `${game.winner} 赢了!`}</h1><button onClick={createNewGame}>再玩一局</button></div>;
    }

    return (
        <div className="mahjong-page">
            <h1>麻将 ({game.game_id})</h1>
            <button onClick={createNewGame}>新游戏</button>
            {error && <div className="error-message" onClick={() => setError(null)}>{error}</div>}

            <div className="mahjong-board">
                <div className="discard-pile">
                    <strong>弃牌:</strong>
                    <div className="tiles">
                        {game.discards.map((t, i) => <img key={t.id + i} src={`/photo/${t.name}.svg`} alt={t.name} />)}
                    </div>
                </div>

                <div className="player-hand">
                    <h3>你的手牌 ({playerHand.length} 张)</h3>
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
                    {isMyTurn && playerHand.length % 3 !== 2 && <button onClick={() => handleAction('drawTile')}>摸牌</button>}
                    {isMyTurn && playerHand.length % 3 === 2 && selectedTile && <button onClick={() => handleAction('discardTile', { tile_id: selectedTile.id })}>出牌</button>}
                    {game.action_options[playerId]?.includes('pung') && <button onClick={() => handleAction('pung')}>碰</button>}
                    {game.action_options[playerId]?.includes('chow') && <button onClick={() => handleAction('chow', { chow_tiles_ids: [] })}>吃</button> /* TODO: UI for selecting which chow */}
                    {game.action_options[playerId]?.includes('kong') && <button onClick={() => handleAction('kong', { kong_type: 'melded' })}>杠</button>}
                    {isMyTurn && concealedKongOptions.map(tileName => (
                        <button key={tileName} onClick={() => handleAction('kong', { kong_type: 'concealed', tile_name: tileName })}>
                            暗杠 {tileName.replace('_', ' ')}
                        </button>
                    ))}
                    {canWin && <button onClick={() => handleAction('win')} className="win-button">胡!</button>}
                </div>
            </div>
        </div>
    );
};

export default MahjongPage;
