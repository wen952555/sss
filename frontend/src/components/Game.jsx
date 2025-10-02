// frontend/src/components/Game.jsx
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import PlayerHand from './PlayerHand';
import Hand from './Hand';
import Results from './Results';
import { sortHand } from '../utils/cardUtils';
import './Game.css';

const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');

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
    const [qrCodeImage, setQrCodeImage] = useState('');
    const [showQRCode, setShowQRCode] = useState(false);

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
            alert("A player disconnected. The game has been reset.");
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

    const handleStartGame = () => socket.emit('start_game');

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
            setError(`The ${targetHandName} hand is already full.`);
            return;
        }

        // Move card logic
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
            return setError("You must arrange all 13 cards.");
        }
        socket.emit('submit_hand', arrangedHands);
        setGameState('submitted');
        setError('');
    };

    const getSubmittedNames = () => submittedPlayers.map(p => p.name).join(', ');

    const handleToggleQRCode = () => {
        if (!showQRCode) {
            try {
                const typeNumber = 4;
                const errorCorrectionLevel = 'L';
                const qr = window.qrcode(typeNumber, errorCorrectionLevel);
                qr.addData(window.location.href);
                qr.make();
                setQrCodeImage(qr.createDataURL());
            } catch (err) {
                console.error('Failed to generate QR code on client', err);
                setError('Could not generate invite code.');
            }
        }
        setShowQRCode(!showQRCode);
    };

    return (
        <div className="game-container">
            <header className="game-header">
                <h1>十三水</h1>
                <p>Status: {isConnected ? 'Connected' : 'Disconnected'} | Players: {players.length}</p>
                {error && <p className="error-message">{error}</p>}
            </header>

            {gameState === 'waiting' && (
                <div className="waiting-room">
                    <button onClick={handleStartGame} disabled={!isConnected || players.length < 2}>
                        Start Game ({players.length} / 4 players)
                    </button>
                    <button onClick={handleToggleQRCode} className="qr-toggle-button">
                        {showQRCode ? 'Hide' : 'Show'} Invite QR Code
                    </button>
                    {showQRCode && qrCodeImage && (
                        <div className="qr-code-container">
                            <img src={qrCodeImage} alt="Invite QR Code" />
                            <p>Scan to join the game!</p>
                        </div>
                    )}
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
                        <h2>Your Hand</h2>
                        <PlayerHand cards={myHand} onCardClick={(card) => handleCardClick(card, 'myHand')} selectedCard={selectedCard} />
                    </div>
                    <button onClick={handleSubmitHand} disabled={myHand.length > 0 || gameState === 'submitted'}>
                        Submit Hand
                    </button>
                </>
            )}

            {gameState === 'submitted' && (
                <div className="waiting-submission">
                    <h2>Hand Submitted! Waiting for others...</h2>
                    <p>Ready: {getSubmittedNames()}</p>
                </div>
            )}

            {gameState === 'results' && gameResult && (
                <>
                    <Results results={gameResult} playerInfo={players} />
                    <button onClick={handleStartGame}>Play Again</button>
                </>
            )}
        </div>
    );
};

export default Game;
