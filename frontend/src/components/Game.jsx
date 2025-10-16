
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as api from '../utils/api';
import PlayerHand from './PlayerHand';
import Hand from './Hand';
import Results from './Results';
import { sortHand } from '../utils/cardUtils';
import { isValidHand } from '../utils/gameLogic';
import { findBestArrangement } from '../utils/smartArrange';
import './Game.css';

const createEmptyHands = () => ({ front: [], middle: [], back: [] });

const Game = ({ token, user }) => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    
    const [players, setPlayers] = useState([]);
    const [myHand, setMyHand] = useState([]);
    const [arrangedHands, setArrangedHands] = useState(createEmptyHands());
    const [selectedCard, setSelectedCard] = useState(null);
    const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, finished
    const [gameResult, setGameResult] = useState(null);
    const [error, setError] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);

    const me = players.find(p => p.id === user?.display_id);

    // The core polling function
    const fetchGameState = useCallback(async () => {
        if (!token) return;
        try {
            const roomState = await api.getRoomState(roomId, token);
            setPlayers(Object.values(roomState.players));
            setGameStatus(roomState.gameState.status);

            if (roomState.gameState.status === 'playing' && me && roomState.gameState.hands[me.id]) {
                // Only set the hand if it hasn't been dealt yet to avoid re-rendering
                if (myHand.length === 0) {
                     setMyHand(sortHand(roomState.gameState.hands[me.id]));
                }
            }
            if (roomState.gameState.status === 'finished') {
                setGameResult(roomState.gameState.results);
            }

        } catch (err) {
            setError(`Error fetching game state: ${err.message}`);
            // If room not found, maybe redirect to lobby
            if (err.message.includes('404')) {
                navigate('/');
            }
        }
    }, [roomId, token, me, myHand.length, navigate]);

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }

        // Initial join
        api.joinRoom(roomId, token).catch(err => setError(`Failed to join room: ${err.message}`));

        // Set up the polling interval
        const intervalId = setInterval(fetchGameState, 2000); // Poll every 2 seconds

        // Cleanup on unmount
        return () => {
            clearInterval(intervalId);
            // No explicit 'leave room' needed in polling architecture
        };
    }, [token, roomId, navigate, fetchGameState]);


    const handleStartGame = async () => {
        try {
            await api.startGame(roomId, token);
            fetchGameState(); // Fetch state immediately after starting
        } catch (err) {
            setError(err.message);
        }
    };

    const handleReadyClick = async () => {
        if (me) {
            try {
                await api.playerReady(roomId, token, !me.isReady);
                fetchGameState(); // Fetch state immediately after action
            } catch (err) {
                setError(err.message);
            }
        }
    };

    const handleSubmitHand = async () => {
        if (myHand.length > 0) return setError("Please place all 13 cards.");
        if (!isValidHand(arrangedHands.front, arrangedHands.middle, arrangedHands.back)) return setError("Invalid hand arrangement (倒水).");
        try {
            await api.submitHand(roomId, token, arrangedHands);
            setHasSubmitted(true);
            fetchGameState(); // Fetch state immediately
        } catch (err) {
            setError(err.message);
        }
    };

    // --- UI LOGIC (Card moving, clearing, etc. - mostly unchanged) ---
    const handleCardClick = (card, source) => {
        if (source !== 'myHand') {
            setArrangedHands(prev => ({ ...prev, [source]: prev[source].filter(c => c.rank !== card.rank || c.suit !== card.suit) }));
            setMyHand(sortHand([...myHand, card]));
            setSelectedCard(null);
            return;
        }
        if (selectedCard?.card.suit === card.suit && selectedCard?.card.rank === card.rank) {
            setSelectedCard(null);
        } else {
            setSelectedCard({ card, source });
        }
    };

    const handleHandSlotClick = (targetHandName) => {
        if (!selectedCard || selectedCard.source !== 'myHand') return;
        const { card } = selectedCard;
        const handLimits = { front: 3, middle: 5, back: 5 };
        if (arrangedHands[targetHandName].length >= handLimits[targetHandName]) return setError(`This section is full.`);

        setMyHand(myHand.filter(c => c.rank !== card.rank || c.suit !== card.suit));
        setArrangedHands(prev => ({ ...prev, [targetHandName]: sortHand([...prev[targetHandName], card]) }));
        setSelectedCard(null);
        setError('');
    };
    
    const handleClearHands = () => {
        const allArrangedCards = [...arrangedHands.front, ...arrangedHands.middle, ...arrangedHands.back];
        setMyHand(sortHand([...myHand, ...allArrangedCards]));
        setArrangedHands(createEmptyHands());
        setError('');
    };

    const handleSmartArrange = () => {
        const allCards = [...myHand, ...Object.values(arrangedHands).flat()];
        if (allCards.length !== 13) return setError("Smart arrange requires all 13 cards.");
        const bestArrangement = findBestArrangement(allCards);
        if (bestArrangement) {
            setArrangedHands(bestArrangement);
            setMyHand([]);
            setError('');
        } else {
            setError("Could not find a valid arrangement.");
        }
    };

    const getPlayerStatusText = (player) => {
        if (gameStatus === 'playing') {
            if (player.hasSubmitted) return ' (Submitted)';
            return ''; // In game, no ready status needed
        }
        if (gameStatus === 'waiting') {
            return player.isHost ? ' (Host)' : (player.isReady ? ' (Ready)' : ' (Not Ready)');
        }
        return '';
    };
    
    const otherPlayers = players.filter(p => p.id !== user?.display_id);
    const allOthersReady = otherPlayers.length > 0 && otherPlayers.every(p => p.isReady);

    // --- RENDER LOGIC ---
    if (!me) return <div className="loading">Joining room...</div>; // Initial loading state

    return (
        <div className="game-container">
            <header className="game-header">
                <Link to="/" className="back-to-lobby-button">Back to Lobby</Link>
                <h1>13-Card Poker - Room: {roomId}</h1>
                <div className="player-list">
                    <span>Players:</span>
                    <ul>
                        {players.map(p => <li key={p.id}>{p.name}{getPlayerStatusText(p)}</li>)}
                    </ul>
                </div>
                {error && <p className="error-message">{error}</p>}
            </header>

            {gameStatus === 'waiting' && (
                <div className="waiting-controls">
                    {!me.isHost && <button onClick={handleReadyClick} className="ready-button">{me.isReady ? 'Cancel Ready' : 'Ready'}</button>}
                    {me.isHost && <button onClick={handleStartGame} disabled={players.length < 2 || !allOthersReady}>Start Game ({players.length}/4)</button>}
                </div>
            )}

            {gameStatus === 'playing' && !hasSubmitted && (
                 <>
                    <div className="arranged-hands">
                         <Hand name="Front (3)" cards={arrangedHands.front} onCardClick={(card) => handleCardClick(card, 'front')} onSlotClick={() => handleHandSlotClick('front')} />
                        <Hand name="Middle (5)" cards={arrangedHands.middle} onCardClick={(card) => handleCardClick(card, 'middle')} onSlotClick={() => handleHandSlotClick('middle')} />
                        <Hand name="Back (5)" cards={arrangedHands.back} onCardClick={(card) => handleCardClick(card, 'back')} onSlotClick={() => handleHandSlotClick('back')} />
                    </div>
                    <div className="player-main-hand">
                        <h2>My Hand</h2>
                        <PlayerHand cards={myHand} onCardClick={(card) => handleCardClick(card, 'myHand')} selectedCard={selectedCard} />
                    </div>
                    <div className="game-actions">
                        <button onClick={handleSmartArrange}>Smart Arrange</button>
                        <button onClick={handleClearHands}>Clear</button>
                        <button onClick={handleSubmitHand} disabled={myHand.length > 0}>Submit Hand</button>
                    </div>
                </>
            )}

            {gameStatus === 'playing' && hasSubmitted && (
                <div className="waiting-submission"><h2>Hand submitted! Waiting for other players...</h2></div>
            )}

            {gameStatus === 'finished' && gameResult && (
                <Results results={gameResult} />
            )}
        </div>
    );
};

export default Game;
