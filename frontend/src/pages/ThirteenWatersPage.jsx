import React, { useState, useEffect, useCallback, useRef } from 'react';
import ApiWorker from '../workers/api.worker.js?worker';
import './ThirteenWatersPage.css';

const ThirteenWatersPage = () => {
    const [game, setGame] = useState(null);
    const [gameId, setGameId] = useState(null);
    const [playerId] = useState('player1');
    const [error, setError] = useState('');
    const worker = useRef(null);

    const [frontHand, setFrontHand] = useState([]);
    const [middleHand, setMiddleHand] = useState([]);
    const [backHand, setBackHand] = useState([]);
    const [unassignedHand, setUnassignedHand] = useState([]);

    const handleAction = useCallback((action, payload = {}) => {
        if (!gameId && !['createGame', 'getGameState'].includes(action)) return;
        const game_id_to_use = action === 'createGame' ? null : gameId;
        worker.current.postMessage({
            action,
            payload: { resource: 'thirteen-waters', game_id: game_id_to_use, player_id: playerId, ...payload },
        });
    }, [gameId, playerId]);

    useEffect(() => {
        worker.current = new ApiWorker();
        worker.current.onmessage = (event) => {
            const { success, action, data, error: workerError } = event.data;
            if (success) {
                setError('');
                if (action === 'createGame') {
                    setGameId(data.game_id);
                    handleAction('getGameState');
                } else if (data.game_state) {
                    setGame(data.game_state);
                    setUnassignedHand(data.game_state.hands[playerId]);
                }
            } else {
                setError(workerError || 'An error occurred.');
            }
        };
        handleAction('createGame');
        return () => worker.current.terminate();
    }, []); // Note: handleAction is not in deps, this is a simplification

    const handleSetHand = () => {
        // Basic validation
        if (frontHand.length !== 3 || middleHand.length !== 5 || backHand.length !== 5) {
            setError("Invalid hand sizes. Must be 3-5-5.");
            return;
        }
        handleAction('setHand', { front: frontHand, middle: middleHand, back: backHand });
    };

    // Placeholder for drag and drop logic
    const handleCardClick = (card, from, to) => {
        // This would be where the drag-and-drop logic goes.
        // For now, we can't implement this, so we'll just have a button.
        alert("Drag and drop not implemented yet. Please arrange your hand and click 'Set Hand'.");
    };

    if (!game) return <div className="loading">Loading...</div>;

    return (
        <div className="thirteen-waters-page">
            <h1>十三水</h1>
            {error && <div className="error-message">{error}</div>}

            <div className="hand-container">
                <h4>Your Hand</h4>
                <div className="hand-area">
                    {unassignedHand.map(c => <img key={c.name} src={`/ppp/${c.name}.svg`} alt={c.name} className="card" />)}
                </div>
            </div>

            <div className="hand-container">
                <h4>Front Hand (3 cards)</h4>
                <div className="hand-area">
                    {/* Placeholder for front hand */}
                </div>
            </div>
            <div className="hand-container">
                <h4>Middle Hand (5 cards)</h4>
                <div className="hand-area">
                    {/* Placeholder for middle hand */}
                </div>
            </div>
            <div className="hand-container">
                <h4>Back Hand (5 cards)</h4>
                <div className="hand-area">
                    {/* Placeholder for back hand */}
                </div>
            </div>

            <button onClick={handleSetHand}>Set Hand</button>
        </div>
    );
};

export default ThirteenWatersPage;
