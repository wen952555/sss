
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
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
    const socketRef = useRef(null);

    const [players, setPlayers] = useState([]);
    const [myHand, setMyHand] = useState([]);
    const [arrangedHands, setArrangedHands] = useState(createEmptyHands());
    const [selectedCard, setSelectedCard] = useState(null);
    const [gameStatus, setGameStatus] = useState('waiting');
    const [gameResult, setGameResult] = useState(null);
    const [error, setError] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);

    const me = players.find(p => p.id === user?.display_id);

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }

        // Connect to the socket server
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:14722', {
            auth: { token }
        });
        socketRef.current = socket;

        // --- Socket Event Listeners ---
        socket.on('connect', () => {
            console.log('Connected to server, joining room...');
            socket.emit('joinRoom', { roomId });
        });

        socket.on('roomStateUpdate', (state) => {
            console.log('Received room state update:', state);
            setPlayers(Object.values(state.players));
            setGameStatus(state.gameState.status);
            if (state.gameState.status === 'finished') {
                setGameResult(state.gameState.results);
            }
            // Reset submission status when a new game starts
            if (state.gameState.status === 'waiting') {
                setHasSubmitted(false);
                setMyHand([]);
                setArrangedHands(createEmptyHands());
            }
        });

        socket.on('playerHandUpdate', (hand) => {
            console.log('Received my hand:', hand);
            setMyHand(sortHand(hand));
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error.message);
            setError(error.message);
            if (error.message.includes('not found')) {
                navigate('/');
            }
        });

        socket.on('disconnect', () => {
             console.log('Disconnected from server.');
             setError('与服务器断开连接。');
        });

        // --- Cleanup on unmount ---
        return () => {
            if (socket) {
                console.log('Disconnecting socket...');
                socket.disconnect();
            }
        };
    }, [token, roomId, navigate]);


    // --- UI Actions ---
    const handleStartGame = () => {
        socketRef.current.emit('startGame');
    };

    const handleReadyClick = () => {
        if (me) {
            socketRef.current.emit('setReady', { isReady: !me.isReady });
        }
    };

    const handleSubmitHand = () => {
        if (myHand.length > 0) return setError("请摆放所有13张牌。");
        if (!isValidHand(arrangedHands.front, arrangedHands.middle, arrangedHands.back)) return setError("牌型无效 (倒水)。");

        socketRef.current.emit('submitHand', { hand: arrangedHands });
        setHasSubmitted(true);
        setError('');
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
        if (arrangedHands[targetHandName].length >= handLimits[targetHandName]) return setError(`此墩已满。`);

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
        if (allCards.length !== 13) return setError("智能理牌需要全部13张牌。");
        const bestArrangement = findBestArrangement(allCards);
        if (bestArrangement) {
            setArrangedHands(bestArrangement);
            setMyHand([]);
            setError('');
        } else {
            setError("找不到有效的牌型组合。");
        }
    };

    const getPlayerStatusText = (player) => {
        if (gameStatus === 'playing') {
            if (player.hasSubmitted) return ' (已提交)';
            return ''; // In game, no ready status needed
        }
        if (gameStatus === 'waiting') {
            return player.isHost ? ' (房主)' : (player.isReady ? ' (准备)' : ' (未准备)');
        }
        return '';
    };
    
    const otherPlayers = players.filter(p => p.id !== user?.display_id);
    const allOthersReady = otherPlayers.length > 0 && otherPlayers.every(p => p.isReady);

    // --- RENDER LOGIC ---
    if (!me) return <div className="loading">加入房间中...</div>; // Initial loading state

    return (
        <div className="game-container">
            <header className="game-header">
                <Link to="/" className="back-to-lobby-button">返回大厅</Link>
                <h1>十三张 - 房间: {roomId}</h1>
                <div className="player-list">
                    <span>玩家:</span>
                    <ul>
                        {players.map(p => <li key={p.id}>{p.name}{getPlayerStatusText(p)}</li>)}
                    </ul>
                </div>
                {error && <p className="error-message">{error}</p>}
            </header>

            {gameStatus === 'waiting' && (
                <div className="waiting-controls">
                    {!me.isHost && <button onClick={handleReadyClick} className="ready-button">{me.isReady ? '取消准备' : '准备'}</button>}
                    {me.isHost && <button onClick={handleStartGame} disabled={players.length < 2 || !allOthersReady}>开始游戏 ({players.length}/4)</button>}
                </div>
            )}

            {gameStatus === 'playing' && !hasSubmitted && (
                 <>
                    <div className="arranged-hands">
                         <Hand name="前墩 (3张)" cards={arrangedHands.front} onCardClick={(card) => handleCardClick(card, 'front')} onSlotClick={() => handleHandSlotClick('front')} />
                        <Hand name="中墩 (5张)" cards={arrangedHands.middle} onCardClick={(card) => handleCardClick(card, 'middle')} onSlotClick={() => handleHandSlotClick('middle')} />
                        <Hand name="后墩 (5张)" cards={arrangedHands.back} onCardClick={(card) => handleCardClick(card, 'back')} onSlotClick={() => handleHandSlotClick('back')} />
                    </div>
                    <div className="player-main-hand">
                        <h2>我的手牌</h2>
                        <PlayerHand cards={myHand} onCardClick={(card) => handleCardClick(card, 'myHand')} selectedCard={selectedCard} />
                    </div>
                    <div className="game-actions">
                        <button onClick={handleSmartArrange}>智能理牌</button>
                        <button onClick={handleClearHands}>清空</button>
                        <button onClick={handleSubmitHand} disabled={myHand.length > 0}>提交牌型</button>
                    </div>
                </>
            )}

            {gameStatus === 'playing' && hasSubmitted && (
                <div className="waiting-submission"><h2>牌型已提交！等待其他玩家...</h2></div>
            )}

            {gameStatus === 'finished' && gameResult && (
                <Results results={gameResult} />
            )}
        </div>
    );
};

export default Game;
