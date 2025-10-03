// frontend/src/components/Game.jsx
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import PlayerHand from './PlayerHand';
import Hand from './Hand';
import Results from './Results';
import AuthModal from './AuthModal'; // Import the modal
import { sortHand } from '../utils/cardUtils';
import './Game.css';

// Dynamically determine the backend URL
// In production, it uses the same host as the frontend, but on port 14722.
// In development, it falls back to localhost:14722.
const backendUrl = import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:14722`;
const socket = io(backendUrl);

const createEmptyHands = () => ({ front: [], middle: [], back: [] });

const Game = () => {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [players, setPlayers] = useState([]);
    const [submittedPlayers, setSubmittedPlayers] = useState([]);
    const [myHand, setMyHand] = useState([]);
    const [arrangedHands, setArrangedHands] = useState(createEmptyHands());
    const [selectedCard, setSelectedCard] = useState(null);
    const [gameState, setGameState] = useState('waiting'); // waiting, playing, submitted, results
    const [gameResult, setGameResult] = useState(null);
    const [error, setError] = useState('');

    // New state for authentication
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [showAuthModal, setShowAuthModal] = useState(false);

    useEffect(() => {
        const onConnect = () => setIsConnected(true);
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
        const onPlayerSubmitted = (player) => {
            console.log(`Player ${player.name} has submitted.`);
            setSubmittedPlayers(prev => [...prev, player]);
        };
        const onGameOver = (results) => {
            console.log("Game over, results:", results);
            setGameResult(results);
            setGameState('results');
        };
        const onErrorMessage = (message) => {
            setError(message);
            setTimeout(() => setError(''), 4000);
        };
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

        return () => {
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
    }, []);

    const handleSetToken = (newToken) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
    };

    const handleStartGame = () => {
        if (!token) {
            alert("请先登录再开始游戏！");
            setShowAuthModal(true);
            return;
        }
        socket.emit('start_game');
    };

    const handleCardClick = (card, source) => {
        if (selectedCard && selectedCard.card.rank === card.rank && selectedCard.card.suit === card.suit) {
            setSelectedCard(null); // Deselect
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
            <AuthModal show={showAuthModal} onClose={() => setShowAuthModal(false)} setToken={handleSetToken} />
            <header className="game-header">
                <div className="auth-status">
                    {token ? (
                        <button onClick={handleLogout} className="auth-button">退出登录</button>
                    ) : (
                        <button onClick={() => setShowAuthModal(true)} className="auth-button">注册/登录</button>
                    )}
                </div>
                <h1>十三水</h1>
                <p>状态: {isConnected ? '已连接' : '已断开'} | 玩家: {players.length}</p>
                {error && <p className="error-message">{error}</p>}
            </header>

            {gameState === 'waiting' && (
                <button onClick={handleStartGame} disabled={!isConnected || players.length < 2}>
                    开始游戏 ({players.length} / 4 玩家)
                </button>
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