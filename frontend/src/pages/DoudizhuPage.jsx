import React, { useState, useEffect, useCallback, useRef } from 'react';
import BiddingControls from '../components/doudizhu/BiddingControls';
import PlayingControls from '../components/doudizhu/PlayingControls';
import DoudizhuPlayer from '../components/doudizhu/DoudizhuPlayer';
import './DoudizhuPage.css';
import ApiWorker from '../workers/api.worker.js?worker';

const POLLING_INTERVAL = 2000;
const AI_PLAYER_IDS = ['player2', 'player3'];

const DoudizhuPage = () => {
    const [game, setGame] = useState(null);
    const [gameId, setGameId] = useState(null);
    const [playerId] = useState('player1');
    const [selectedCards, setSelectedCards] = useState([]);
    const [error, setError] = useState(null);
    const worker = useRef(null);

    const handleCardSelect = (card) => {
        setSelectedCards(prev =>
            prev.find(c => c.name === card.name)
                ? prev.filter(c => c.name !== card.name)
                : [...prev, card]
        );
    };

    const handlePlay = useCallback((cards, pId = playerId) => {
        if (!gameId || !worker.current) return;
        if (pId === playerId && cards.length === 0) {
            setError("请选择要出的牌。");
            return;
        }
        worker.current.postMessage({
            action: 'playHand',
            payload: { resource: 'doudizhu', game_id: gameId, player_id: pId, cards: cards },
        });
        if (pId === playerId) setSelectedCards([]);
    }, [gameId, playerId]);

    const handlePass = useCallback((pId = playerId) => {
        if (!gameId || !worker.current) return;
        worker.current.postMessage({
            action: 'passTurn',
            payload: { resource: 'doudizhu', game_id: gameId, player_id: pId },
        });
    }, [gameId, playerId]);

    const triggerAiPlay = useCallback((aiPlayerId) => {
        if (!gameId || !worker.current) return;
        worker.current.postMessage({
            action: 'getAiPlay',
            payload: { resource: 'doudizhu', game_id: gameId, player_id: aiPlayerId },
        });
    }, [gameId]);

    const handleBid = useCallback((bidAmount, pId = playerId) => {
        if (!gameId || !worker.current) return;
        worker.current.postMessage({
            action: 'makeBid',
            payload: { resource: 'doudizhu', game_id: gameId, player_id: pId, bid: bidAmount },
        });
    }, [gameId, playerId]);

    const fetchGameState = useCallback((gid) => {
        if (!gid || !worker.current) return;
        worker.current.postMessage({
            action: 'getGameState',
            payload: { resource: 'doudizhu', game_id: gid, player_id: playerId, show_all: true },
        });
    }, [playerId]);

    const createNewGame = useCallback(() => {
        if (!worker.current) return;
        setError(null);
        setGame(null);
        setGameId(null);
        worker.current.postMessage({
            action: 'createGame',
            payload: { resource: 'doudizhu' },
        });
    }, []);

    const triggerAiBid = useCallback((aiPlayerId) => {
        if (!gameId || !worker.current) return;
        worker.current.postMessage({
            action: 'getAiBid',
            payload: { resource: 'doudizhu', game_id: gameId, player_id: aiPlayerId },
        });
    }, [gameId]);

    useEffect(() => {
        worker.current = new ApiWorker();
        worker.current.onmessage = (event) => {
            const { success, action, data, error: workerError } = event.data;
            if (success) {
                setError(null);
                switch (action) {
                    case 'createGame': setGameId(data.game_id); break;
                    case 'getGameState':
                        if (data.game_state) setGame(data.game_state);
                        else { setError(data.message); setGameId(null); }
                        break;
                    case 'makeBid': case 'playHand': case 'passTurn': break;
                    case 'getAiBid':
                        setGame(g => {
                            if (data.bid !== undefined && g && g.bidding) handleBid(data.bid, g.bidding.turn);
                            return g;
                        });
                        break;
                    case 'getAiPlay':
                        setGame(g => {
                            if (data.move && g.current_turn) {
                                if (data.move.action === 'play') handlePlay(data.move.cards, g.current_turn);
                                else handlePass(g.current_turn);
                            }
                            return g;
                        });
                        break;
                }
            } else {
                setError(workerError || '发生未知错误。');
            }
        };
        return () => worker.current.terminate();
    }, [handleBid, handlePlay, handlePass]);

    useEffect(() => { createNewGame(); }, [createNewGame]);

    useEffect(() => {
        if (gameId) {
            fetchGameState(gameId);
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
        if (!game) return;
        if (game.game_phase === 'bidding' && AI_PLAYER_IDS.includes(game.bidding.turn)) {
            const timer = setTimeout(() => triggerAiBid(game.bidding.turn), 1500);
            return () => clearTimeout(timer);
        }
        if (game.game_phase === 'playing' && AI_PLAYER_IDS.includes(game.current_turn)) {
            const timer = setTimeout(() => triggerAiPlay(game.current_turn), 1500);
            return () => clearTimeout(timer);
        }
    }, [game, triggerAiBid, triggerAiPlay]);

    if (!game) {
        return (
            <div className="doudizhu-page">
                <div className="game-header"><h1>斗地主</h1><button onClick={createNewGame}>新游戏</button></div>
                {error && <div className="error-message">{error}</div>}
                {!error && <div className="loading">加载中...</div>}
            </div>
        );
    }

    const getPlayer = (pId) => ({
        name: pId,
        hand: game.hands[pId] || [],
        isLandlord: game.landlord === pId,
        isMyTurn: game.game_phase === 'bidding' ? game.bidding.turn === pId : game.current_turn === pId,
    });

    return (
        <div className="doudizhu-page">
            <div className="doudizhu-board">
                <div className="player2-area"><DoudizhuPlayer {...getPlayer('player2')} /></div>
                <div className="kitty-area">
                    {game.kitty.map((card, index) =>
                        game.landlord ?
                        <img key={index} src={`/ppp/${card.name}.svg`} alt="kitty card" className="card-small" /> :
                        <div key={index} className="kitty-card"></div>
                    )}
                </div>
                <div className="player3-area"><DoudizhuPlayer {...getPlayer('player3')} /></div>
                <div className="center-info">
                    {game.game_phase === 'bidding' && (
                        <>
                            <p>当前叫分: {game.bidding.highest_bid}</p>
                            <BiddingControls
                                currentBid={game.bidding.highest_bid}
                                isMyTurn={game.bidding.turn === playerId}
                                onBid={handleBid}
                            />
                        </>
                    )}
                    {game.game_phase === 'playing' && (
                        <>
                            <p>轮到: {game.current_turn}</p>
                            <PlayingControls
                                isMyTurn={game.current_turn === playerId}
                                onPlay={() => handlePlay(selectedCards)}
                                onPass={() => handlePass()}
                            />
                        </>
                    )}
                </div>
                <div className="player1-area">
                    <DoudizhuPlayer
                        {...getPlayer('player1')}
                        selectedCards={selectedCards}
                        onCardSelect={handleCardSelect}
                    />
                </div>
            </div>
        </div>
    );
};

export default DoudizhuPage;
