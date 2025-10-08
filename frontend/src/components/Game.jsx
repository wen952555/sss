// frontend/src/components/Game.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import PlayerHand from './PlayerHand';
import Hand from './Hand';
import Results from './Results';
import { sortHand } from '../utils/cardUtils';
import { isValidHand } from '../utils/gameLogic'; // Import for client-side validation
import { findBestArrangement } from '../utils/smartArrange';
import './Game.css';

const createEmptyHands = () => ({ front: [], middle: [], back: [] });

const Game = ({ token }) => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [players, setPlayers] = useState([]);
    const [myHand, setMyHand] = useState([]);
    const [arrangedHands, setArrangedHands] = useState(createEmptyHands());
    const [selectedCard, setSelectedCard] = useState(null);
    const [gameState, setGameState] = useState('等待中');
    const [gameResult, setGameResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            navigate('/'); // Redirect to lobby if no token
            return;
        }

        const handleConnect = () => {
            setIsConnected(true);
            console.log(`Joining room: ${roomId}`);
            socket.emit('join_room', roomId, token);
        };

        const handleDisconnect = () => setIsConnected(false);
        const handlePlayersUpdate = (updatedPlayers) => setPlayers(updatedPlayers);

        const handleGameStarted = () => {
            setGameState('游戏中');
            setArrangedHands(createEmptyHands());
            setGameResult(null);
            setError('');
        };

        const handleDealHand = (hand) => setMyHand(sortHand(hand));
        const handleGameOver = (results) => {
            setGameResult(results);
            setGameState('比牌结果');
        };
        const handleErrorMessage = (message) => setError(message);

        const handleGameReset = () => {
            alert("有玩家离线或房主重置了游戏。");
            setMyHand([]);
            setArrangedHands(createEmptyHands());
            setGameState('等待中');
            setGameResult(null);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('players_update', handlePlayersUpdate);
        socket.on('game_started', handleGameStarted);
        socket.on('deal_hand', handleDealHand);
        socket.on('game_over', handleGameOver);
        socket.on('error_message', handleErrorMessage);
        socket.on('game_reset', handleGameReset);

        if (socket.connected) {
            handleConnect();
        } else {
            socket.connect();
        }

        return () => {
            // Actively leave the room when the component unmounts
            console.log(`Actively leaving room: ${roomId}`);
            socket.emit('leave_room', roomId);

            // Clean up all listeners to prevent memory leaks
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('players_update', handlePlayersUpdate);
            socket.off('game_started', handleGameStarted);
            socket.off('deal_hand', handleDealHand);
            socket.off('game_over', handleGameOver);
            socket.off('error_message', handleErrorMessage);
            socket.off('game_reset', handleGameReset);
        };
    }, [token, roomId, navigate]);

    const me = players.find(p => p.socketId === socket.id);
    const otherPlayers = players.filter(p => p.socketId !== socket.id);
    const allOthersReady = otherPlayers.length > 0 && otherPlayers.every(p => p.isReady);

    const handleStartGame = () => socket.emit('start_game');
    const handleReadyClick = () => {
        if (me) socket.emit('player_ready', !me.isReady);
    };

    const handleCardClick = (card, source) => {
        // If a card in an arranged hand is clicked, move it back to the main hand.
        if (source !== 'myHand') {
            const sourceHand = arrangedHands[source];
            const newSourceHand = sourceHand.filter(c => c.rank !== card.rank || c.suit !== card.suit);
            const newMyHand = sortHand([...myHand, card]);

            setArrangedHands(prev => ({ ...prev, [source]: newSourceHand }));
            setMyHand(newMyHand);
            setSelectedCard(null); // Always deselect after this action
            return;
        }

        // Original logic for selecting/deselecting a card from the main hand
        if (selectedCard?.card.suit === card.suit && selectedCard?.card.rank === card.rank) {
            setSelectedCard(null);
        } else {
            setSelectedCard({ card, source });
        }
    };

    const handleHandSlotClick = (targetHandName) => {
        // This function now only places cards from the main hand into an arranged hand.
        if (!selectedCard || selectedCard.source !== 'myHand') {
            // If a card is selected from an arranged hand, this logic path is no longer reachable
            // because handleCardClick would have already moved it.
            return;
        }

        const { card } = selectedCard;
        const targetHand = arrangedHands[targetHandName];
        const handLimits = { front: 3, middle: 5, back: 5 };
        if (targetHand.length >= handLimits[targetHandName]) return setError(`此墩已满`);

        const newMyHand = myHand.filter(c => c.rank !== card.rank || c.suit !== card.suit);
        const newTargetHand = sortHand([...targetHand, card]);

        setMyHand(newMyHand);
        setArrangedHands(prev => ({ ...prev, [targetHandName]: newTargetHand }));
        setSelectedCard(null);
        setError('');
    };

    const handleSubmitHand = () => {
        if (myHand.length > 0) return setError("请摆完所有13张牌。");
        if (!isValidHand(arrangedHands.front, arrangedHands.middle, arrangedHands.back)) return setError("牌型不合法 (倒水)，请重新摆牌。");
        socket.emit('submit_hand', arrangedHands);
        setGameState('已提交');
    };

    const handleClearHands = () => {
        const allArrangedCards = [
            ...arrangedHands.front,
            ...arrangedHands.middle,
            ...arrangedHands.back,
        ];
        setMyHand(sortHand([...myHand, ...allArrangedCards]));
        setArrangedHands(createEmptyHands());
        setError('');
    };

    const handleSmartArrange = () => {
        const allCards = [...myHand, ...arrangedHands.front, ...arrangedHands.middle, ...arrangedHands.back];
        if (allCards.length !== 13) {
            return setError("需要全部13张手牌才能进行智能理牌。");
        }
        const bestArrangement = findBestArrangement(allCards);
        if (bestArrangement) {
            setArrangedHands(bestArrangement);
            setMyHand([]);
            setError('');
        } else {
            setError("无法找到有效的理牌方案。");
        }
    };

    const getPlayerStatusText = (player) => {
        if (gameState === '游戏中' && player.hasSubmitted) return ' (已提交)';
        if (gameState === '等待中') {
            return player.isHost ? ' (房主)' : (player.isReady ? ' (已准备)' : ' (未准备)');
        }
        return '';
    };

    return (
        <div className="game-container">
            <header className="game-header">
                <Link to="/" className="back-to-lobby-button">返回大厅</Link>
                <h1>十三水 - 房间: {roomId}</h1>
                <div className="game-info">
                     <div className="player-list">
                        <span>玩家列表:</span>
                        <ul>
                            {players.map(p => (
                                <li key={p.id || p.socketId}>{p.name}{getPlayerStatusText(p)}</li>
                            ))}
                        </ul>
                    </div>
                </div>
                {error && <p className="error-message">{error}</p>}
            </header>

            {gameState === '等待中' && (
                <div className="waiting-controls">
                    {!me?.isHost && (
                        <button onClick={handleReadyClick} className="ready-button">
                            {me?.isReady ? '取消准备' : '准备'}
                        </button>
                    )}
                    {me?.isHost && (
                        <button onClick={handleStartGame} disabled={!isConnected || players.length < 2 || !allOthersReady}>
                            开始游戏 ({players.length}/4)
                        </button>
                    )}
                </div>
            )}

            {gameState === '游戏中' && (
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
                    <div className="game-actions">
                        <button onClick={handleSmartArrange}>智能理牌</button>
                        <button onClick={handleClearHands}>清空牌墩</button>
                        <button onClick={handleSubmitHand} disabled={myHand.length > 0}>提交手牌</button>
                    </div>
                </>
            )}

            {gameState === '已提交' && (
                <div className="waiting-submission"><h2>手牌已提交！等待其他玩家...</h2></div>
            )}

            {gameState === '比牌结果' && gameResult && (
                <Results results={gameResult} />
            )}
        </div>
    );
};

export default Game;