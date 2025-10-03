// frontend/src/components/Game.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { socket } from '../socket'; // Use the shared socket instance
import PlayerHand from './PlayerHand';
import Hand from './Hand';
import Results from './Results';
import { sortHand } from '../utils/cardUtils';
import './Game.css';

const createEmptyHands = () => ({ front: [], middle: [], back: [] });

const Game = ({ token }) => {
    const { roomId } = useParams(); // Get roomId from URL
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [players, setPlayers] = useState([]);
    const [submittedPlayers, setSubmittedPlayers] = useState([]);
    const [myHand, setMyHand] = useState([]);
    const [arrangedHands, setArrangedHands] = useState(createEmptyHands());
    const [selectedCard, setSelectedCard] = useState(null);
    const [gameState, setGameState] = useState('waiting');
    const [gameResult, setGameResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        // Automatically join the room when the component mounts or token/roomId changes
        if (token && roomId) {
            console.log(`Joining room: ${roomId}`);
            socket.emit('join_room', roomId, token);
        }

        const onConnect = () => {
            setIsConnected(true);
            // If we reconnect, automatically try to re-join the room
            if (token && roomId) {
                socket.emit('join_room', roomId, token);
            }
        };

        const onDisconnect = () => setIsConnected(false);
        const onPlayersUpdate = (updatedPlayers) => setPlayers(updatedPlayers);
        const onGameStarted = () => {
            console.log("Game has started!");
            setGameState('playing');
            setArrangedHands(createEmptyHands());
            setSubmittedPlayers([]);
            setGameResult(null);
            setError('');
        };
        const onDealHand = (hand) => setMyHand(sortHand(hand));
        const onPlayerSubmitted = (player) => setSubmittedPlayers(prev => [...prev, player]);
        const onGameOver = (results) => {
            console.log("Game over, results:", results);
            setGameResult(results);
            setGameState('results');
        };
        const onErrorMessage = (message) => setError(message);
        const onGameReset = () => {
            alert("有玩家离线，游戏已重置。");
            setMyHand([]);
            setArrangedHands(createEmptyHands());
            setGameState('waiting');
            setGameResult(null);
            setSubmittedPlayers([]);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('players_update', onPlayersUpdate);
        socket.on('game_started', onGameStarted);
        socket.on('deal_hand', onDealHand);
        socket.on('player_submitted', onPlayerSubmitted);
        socket.on('game_over', onGameOver);
        socket.on('error_message', onErrorMessage);
        socket.on('game_reset', onGameReset);

        // This is the key to leaving the room when the component unmounts
        return () => {
            console.log(`Leaving room: ${roomId}`);
            socket.emit('leave_room', roomId);

            // Clean up all listeners
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('players_update', onPlayersUpdate);
            socket.off('game_started', onGameStarted);
            socket.off('deal_hand', onDealHand);
            socket.off('player_submitted', onPlayerSubmitted);
            socket.off('game_over', onGameOver);
            socket.off('error_message', onErrorMessage);
            socket.off('game_reset', onGameReset);
        };
    }, [token, roomId]); // Rerun effect if token or roomId changes

    const handleStartGame = () => {
        socket.emit('start_game');
    };

    const handleReadyClick = () => {
        const me = players.find(p => p.socketId === socket.id);
        if (me) {
            socket.emit('player_ready', !me.isReady);
        }
    };

    const handleCardClick = (card, source) => {
        if (selectedCard && selectedCard.card.rank === card.rank && selectedCard.card.suit === card.suit) {
            setSelectedCard(null);
        } else {
            setSelectedCard({ card, source });
        }
    };

    const handleHandSlotClick = (targetHandName) => {
        if (!selectedCard) return;
        const { card, source } = selectedCard;
        const targetHand = arrangedHands[targetHandName];
        const handLimits = { front: 3, middle: 5, back: 5 };

        if (targetHand.length >= handLimits[targetHandName]) {
            setError(`此墩已满`);
            return;
        }

        const sourceIsArranged = source !== 'myHand';
        const sourceHand = sourceIsArranged ? arrangedHands[source] : myHand;
        const newSourceHand = sourceHand.filter(c => !(c.rank === card.rank && c.suit === card.suit));
        const newTargetHand = sortHand([...targetHand, card]);

        if (sourceIsArranged) {
            setArrangedHands({ ...arrangedHands, [source]: newSourceHand, [targetHandName]: newTargetHand });
        } else {
            setMyHand(newSourceHand);
            setArrangedHands({ ...arrangedHands, [targetHandName]: newTargetHand });
        }
        
        setSelectedCard(null);
        setError('');
    };

    const handleSubmitHand = () => {
        if (myHand.length > 0) {
            return setError("请摆完所有13张牌。");
        }
        socket.emit('submit_hand', arrangedHands);
        setGameState('submitted');
        setError('');
    };

    const getSubmittedNames = () => submittedPlayers.map(p => p.name).join(', ');

    return (
        <div className="game-container">
            <header className="game-header">
                <Link to="/" className="back-to-lobby-button">返回大厅</Link>
                <h1>十三水 - 房间: {roomId}</h1>
                <div className="game-info">
                    <span>状态: {isConnected ? '已连接' : '已断开'}</span>
                    <div className="player-list">
                        <span>玩家列表:</span>
                        <ul>
                            {players.map(p => (
                                <li key={p.id}>{p.name} {p.isReady ? '✅' : '❌'}</li>
                            ))}
                        </ul>
                    </div>
                </div>
                {error && <p className="error-message">{error}</p>}
            </header>

            {gameState === 'waiting' && (
                <div className="waiting-controls">
                    <button onClick={handleReadyClick}>
                        {players.find(p => p.socketId === socket.id)?.isReady ? '取消准备' : '准备'}
                    </button>
                    <button onClick={handleStartGame} disabled={!isConnected || players.length < 2}>
                        开始游戏 ({players.length} / 4 玩家)
                    </button>
                </div>
            )}

            {gameState === 'playing' && (
                <>
                    <div className="arranged-hands">
                        <Hand name="前墩 (3)" cards={arrangedHands.front} onCardClick={(card) => handleCardClick(card, 'front')} onSlotClick={() => handleHandSlotClick('front')} selectedCard={selectedCard} />
                        <Hand name="中墩 (5)" cards={arrangedHands.middle} onCardClick={(card) => handleCardClick(card, 'middle')} onSlotClick={() => handleHandSlotClick('middle')} selectedCard={selectedCard} />
                        <Hand name="后墩 (5)" cards={arrangedHands.back} onCardClick={(card) => handleCardClick(card, 'back')} onSlotClick={() => handleHandSlotClick('back')} selectedCard={selectedCard} />
                    </div>
                    <div className="player-main-hand">
                        <h2>我的手牌</h2>
                        <PlayerHand cards={myHand} onCardClick={(card) => handleCardClick(card, 'myHand')} selectedCard={selectedCard} />
                    </div>
                    <button onClick={handleSubmitHand} disabled={myHand.length > 0 || gameState === 'submitted'}>
                        提交手牌
                    </button>
                </>
            )}

            {gameState === 'submitted' && (
                <div className="waiting-submission">
                    <h2>手牌已提交！等待其他玩家...</h2>
                    <p>已准备: {getSubmittedNames()}</p>
                </div>
            )}

            {gameState === 'results' && gameResult && (
                <>
                    <Results results={gameResult} playerInfo={players} />
                    <button onClick={handleStartGame}>再玩一局</button>
                </>
            )}
        </div>
    );
};

export default Game;