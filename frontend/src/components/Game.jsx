// frontend/src/components/Game.jsx
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import PlayerHand from './PlayerHand';
import Hand from './Hand'; // We will create this component
import Results from './Results'; // We will create this component
import { sortHand } from '../utils/cardUtils';
import './Game.css';

const socket = io(import.meta.env.VITE_BACKEND_URL);

// Helper to create initial empty hands
const createEmptyHands = () => ({
    front: [],
    middle: [],
    back: []
});

const Game = () => {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [players, setPlayers] = useState([]);
    const [myHand, setMyHand] = useState([]);
    const [arrangedHands, setArrangedHands] = useState(createEmptyHands());
    const [selectedCard, setSelectedCard] = useState(null);
    const [gameState, setGameState] = useState('waiting'); // waiting, playing, submitted, results
    const [gameResult, setGameResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
            console.log('Connected!');
        }
        function onDisconnect() {
            setIsConnected(false);
            console.log('Disconnected.');
        }
        function onPlayersUpdate(updatedPlayers) {
            setPlayers(updatedPlayers);
        }
        function onDealHand(hand) {
            setMyHand(sortHand(hand));
            setGameState('playing');
            setArrangedHands(createEmptyHands());
            setGameResult(null);
            setError('');
        }
        function onGameStarted() {
            console.log("Game has started!");
        }
        function onPlayerSubmitted(playerId) {
            console.log(`Player ${playerId} has submitted their hand.`);
            // Optionally, update UI to show which players are ready
        }
        function onGameOver(results) {
            setGameResult(results);
            setGameState('results');
        }
        function onErrorMessage(message) {
            setError(message);
            setTimeout(() => setError(''), 3000); // Clear error after 3s
        }
        function onGameReset() {
            alert("A player disconnected. The game has been reset.");
            setMyHand([]);
            setArrangedHands(createEmptyHands());
            setGameState('waiting');
            setGameResult(null);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('players_update', onPlayersUpdate);
        socket.on('deal_hand', onDealHand);
        socket.on('game_started', onGameStarted);
        socket.on('player_submitted', onPlayerSubmitted);
        socket.on('game_over', onGameOver);
        socket.on('error_message', onErrorMessage);
        socket.on('game_reset', onGameReset);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('players_update', onPlayersUpdate);
            socket.off('deal_hand', onDealHand);
            socket.off('game_started', onGameStarted);
            socket.off('player_submitted', onPlayerSubmitted);
            socket.off('game_over', onGameOver);
            socket.off('error_message', onErrorMessage);
            socket.off('game_reset', onGameReset);
        };
    }, []);

    const handleStartGame = () => {
        socket.emit('start_game');
    };

    const handleCardClick = (card, source) => {
        if (selectedCard) {
            // Deselect if clicking the same card
            if (selectedCard.card.rank === card.rank && selectedCard.card.suit === card.suit) {
                setSelectedCard(null);
            }
        } else {
            setSelectedCard({ card, source });
        }
    };

    const handleHandSlotClick = (targetHandName) => {
        if (!selectedCard) return;

        const { card, source } = selectedCard;
        const targetHand = arrangedHands[targetHandName];

        // Define hand size limits
        const handLimits = { front: 3, middle: 5, back: 5 };
        if (targetHand.length >= handLimits[targetHandName]) {
            setError(`The ${targetHandName} hand is already full.`);
            return;
        }

        // Move card from source to target
        let sourceHand;
        if (source === 'myHand') {
            sourceHand = myHand;
        } else {
            sourceHand = arrangedHands[source];
        }

        const newSourceHand = sourceHand.filter(c => !(c.rank === card.rank && c.suit === card.suit));
        const newTargetHand = sortHand([...targetHand, card]);

        const newArrangedHands = {
            ...arrangedHands,
            [targetHandName]: newTargetHand
        };

        if (source === 'myHand') {
            setMyHand(newSourceHand);
        } else {
            newArrangedHands[source] = newSourceHand;
        }

        setArrangedHands(newArrangedHands);
        setSelectedCard(null);
        setError('');
    };

    const handleSubmitHand = () => {
        if (myHand.length > 0) {
            setError("You must arrange all 13 cards.");
            return;
        }
        // Additional validation can be done here if needed
        socket.emit('submit_hand', arrangedHands);
        setGameState('submitted');
        setError('');
    };

    return (
        <div className="game-container">
            <header className="game-header">
                <h1>十三水</h1>
                <p>Status: {isConnected ? 'Connected' : 'Disconnected'} | Players: {players.length}</p>
                {error && <p className="error-message">{error}</p>}
            </header>

            {gameState === 'waiting' && (
                <button onClick={handleStartGame} disabled={!isConnected || players.length < 2}>
                    Start Game ({players.length}/4 players)
                </button>
            )}

            {gameState === 'playing' && (
                <>
                    <div className="arranged-hands">
                        <Hand name="Front (3)" cards={arrangedHands.front} onCardClick={(card) => handleCardClick(card, 'front')} onSlotClick={() => handleHandSlotClick('front')} selectedCard={selectedCard} />
                        <Hand name="Middle (5)" cards={arrangedHands.middle} onCardClick={(card) => handleCardClick(card, 'middle')} onSlotClick={() => handleHandSlotClick('middle')} selectedCard={selectedCard} />
                        <Hand name="Back (5)" cards={arrangedHands.back} onCardClick={(card) => handleCardClick(card, 'back')} onSlotClick={() => handleHandSlotClick('back')} selectedCard={selectedCard} />
                    </div>
                    <div className="player-main-hand">
                        <h2>Your Hand</h2>
                        <PlayerHand cards={myHand} onCardClick={(card) => handleCardClick(card, 'myHand')} selectedCard={selectedCard} />
                    </div>
                    <button onClick={handleSubmitHand} disabled={myHand.length > 0}>
                        Submit Hand
                    </button>
                </>
            )}

            {gameState === 'submitted' && (
                <h2>Hand Submitted! Waiting for other players...</h2>
            )}

            {gameState === 'results' && gameResult && (
                <>
                    <Results results={gameResult} />
                    <button onClick={handleStartGame}>Play Again</button>
                </>
            )}
        </div>
    );
};

export default Game;