// src/pages/GamePage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { connectSocket, sendSocketMessage, closeSocket, getSocket } from '../services/socket';
import Card from '../components/Game/Card';
// import PlayerHand from '../components/Game/PlayerHand'; // For arranging
// import GameBoardLayout from '../components/Game/GameBoardLayout'; // Areas for front/middle/back
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend'; // For touch devices
import {十三水AI简易分牌} from '../utils/thirteenWaterLogic'; // AI logic

const ItemTypes = { CARD: 'card' };

// Draggable Card Component
const DraggableCard = ({ id, cardId, currentZone, onDropCard }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.CARD,
        item: { id, cardId, zone: currentZone }, // pass cardId and its original zone
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1, cursor: 'move', display: 'inline-block', margin: '2px' }}>
            <Card cardId={cardId} />
        </div>
    );
};

// Drop Zone Component
const DropZone = ({ zoneId, cardsInZone, onDropCard, acceptType, maxCards, title }) => {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: acceptType, // Only accept CARD type
        drop: (item) => { // item is { id, cardId, zone: originalZone }
            if (cardsInZone.length < maxCards) {
                onDropCard(item.cardId, item.zone, zoneId); // cardId, fromZone, toZone
            } else {
                console.log(`Zone ${zoneId} is full.`);
            }
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }), [cardsInZone]); // Dependency on cardsInZone to re-evaluate canDrop

    return (
        <div ref={drop} style={{ border: '1px dashed gray', minHeight: '80px', minWidth: '100px', padding: '10px', margin: '10px', backgroundColor: isOver ? 'lightgreen' : 'white' }}>
            <strong>{title} ({cardsInZone.length}/{maxCards})</strong>
            <div>
                {cardsInZone.map(cardId => (
                    <DraggableCard key={cardId} id={cardId} cardId={cardId} currentZone={zoneId} onDropCard={onDropCard} />
                ))}
            </div>
        </div>
    );
};


const GamePage = () => {
    const { user } = useAuth();
    const [gameState, setGameState] = useState(null); // Full game state from server
    const [myCards, setMyCards] = useState([]); // Player's 13 cards
    const [handZone, setHandZone] = useState([]); // Cards not yet placed
    const [frontZone, setFrontZone] = useState([]); // 3 cards
    const [middleZone, setMiddleZone] = useState([]); // 5 cards
    const [backZone, setBackZone] = useState([]); // 5 cards
    const [roomId, setRoomId] = useState('default_room'); // Or from lobby/URL
    const [messages, setMessages] = useState([]); // Game messages

    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const DnDBackend = isTouchDevice() ? TouchBackend : HTML5Backend;


    const handleSocketMessage = useCallback((msg) => {
        setMessages(prev => [...prev, msg]);
        switch (msg.type) {
            case 'system':
                console.log("System message:", msg.message);
                break;
            case 'joined_room':
                console.log("Joined room:", msg.roomId, "Players:", msg.players);
                // You might want to update a player list UI here
                break;
            case 'player_joined':
                console.log("Player joined:", msg.userId, "Players:", msg.players);
                // Update player list UI
                break;
            case 'player_left':
                console.log("Player left:", msg.userId);
                // Update player list UI
                break;
            case 'game_started':
                setMyCards(msg.your_cards);
                setHandZone(msg.your_cards); // Initially all cards are in handZone
                setFrontZone([]);
                setMiddleZone([]);
                setBackZone([]);
                setGameState({ status: 'arranging', players: msg.players });
                console.log("Game started! Your cards:", msg.your_cards);
                break;
            case 'cards_submitted':
                alert(msg.message);
                // Maybe disable submission button or show waiting state
                break;
            case 'game_over':
                setGameState({ status: 'finished', results: msg.results });
                // Display results, update scores
                alert("Game Over! Check results.");
                console.log("Game results:", msg.results);
                // Option to start new game
                break;
            case 'player_ready':
                console.log(`Player ${msg.userId} is ready.`);
                // Update UI to show which players are ready
                break;
            case 'error':
                console.error("Game Error:", msg.message);
                alert(`Error: ${msg.message}`);
                break;
            default:
                console.log("Unknown message type:", msg);
        }
    }, []); // No dependencies needed for this definition

    useEffect(() => {
        if (user && user.id) {
            connectSocket(
                user.id,
                handleSocketMessage,
                () => { // onOpen
                    sendSocketMessage({ type: 'join_room', roomId: roomId, userId: user.id });
                },
                () => console.log("Socket closed"), // onClose
                (err) => console.error("Socket error", err) // onError
            );
        }
        return () => {
            if (getSocket()) {
                sendSocketMessage({ type: 'leave_room', roomId: roomId, userId: user?.id });
                closeSocket();
            }
        };
    }, [user, roomId, handleSocketMessage]); // Rerun if user or roomId changes

    const handleDropCard = (cardId, fromZoneId, toZoneId) => {
        if (fromZoneId === toZoneId) return; // No change

        let cardToMove = cardId;

        // Remove from source zone
        if (fromZoneId === 'hand') setHandZone(prev => prev.filter(c => c !== cardToMove));
        else if (fromZoneId === 'front') setFrontZone(prev => prev.filter(c => c !== cardToMove));
        else if (fromZoneId === 'middle') setMiddleZone(prev => prev.filter(c => c !== cardToMove));
        else if (fromZoneId === 'back') setBackZone(prev => prev.filter(c => c !== cardToMove));

        // Add to destination zone
        if (toZoneId === 'hand') setHandZone(prev => [...prev, cardToMove]);
        else if (toZoneId === 'front' && frontZone.length < 3) setFrontZone(prev => [...prev, cardToMove]);
        else if (toZoneId === 'middle' && middleZone.length < 5) setMiddleZone(prev => [...prev, cardToMove]);
        else if (toZoneId === 'back' && backZone.length < 5) setBackZone(prev => [...prev, cardToMove]);
        else { // Target zone full or invalid, return to hand (or original zone)
            if (fromZoneId === 'hand') setHandZone(prev => [...prev, cardToMove]); // Should not happen if logic is correct
            else if (fromZoneId === 'front') setFrontZone(prev => [...prev, cardToMove]);
            else if (fromZoneId === 'middle') setMiddleZone(prev => [...prev, cardToMove]);
            else if (fromZoneId === 'back') setBackZone(prev => [...prev, cardToMove]);
            console.log(`Cannot move ${cardToMove} to ${toZoneId}, zone full or invalid. Returning.`);
            return; // Exit early if card couldn't be placed in target
        }
    };


    const handleStartGame = () => {
        sendSocketMessage({ type: 'start_game', roomId: roomId });
    };

    const handleSubmitCards = () => {
        if (frontZone.length !== 3 || middleZone.length !== 5 || backZone.length !== 5) {
            alert("牌墩数量不正确！头道3张，中道5张，尾道5张。");
            return;
        }
        // TODO: Add validation that front < middle < back if not handled by server
        sendSocketMessage({
            type: 'submit_cards',
            roomId: roomId,
            userId: user.id,
            cards: {
                front: frontZone,
                middle: middleZone,
                back: backZone,
            }
        });
    };

    const handleAiArrange = () => {
        if (myCards.length === 13) {
            // This AI logic should ideally be more robust and possibly on the server for complex AI
            // For now, using a simple frontend version:
            const arrangement =十三水AI简易分牌(myCards); // This function needs to be defined in utils
            setFrontZone(arrangement.front);
            setMiddleZone(arrangement.middle);
            setBackZone(arrangement.back);
            setHandZone([]); // All cards placed
        } else {
            alert("没有足够的牌进行AI分牌。");
        }
    };


    if (!user) return <p>请先登录...</p>;
    // DndProvider should wrap the part of your component tree that uses dnd
    return (
        <DndProvider backend={DnDBackend} options={{ enableMouseEvents: !isTouchDevice() }}>
            <div>
                <h2>十三水游戏房间: {roomId}</h2>
                <p>玩家: {user.phone_number} ({user.points} 积分)</p>
                {!gameState || gameState.status === 'waiting' || gameState.status === 'finished' ? (
                    <button onClick={handleStartGame}>开始游戏</button>
                ) : null}

                {gameState && gameState.status === 'arranging' && (
                    <>
                        <h3>你的牌 (拖拽到下面牌墩):</h3>
                        <DropZone zoneId="hand" cardsInZone={handZone} onDropCard={handleDropCard} acceptType={ItemTypes.CARD} maxCards={13} title="手牌区" />

                        <h3>牌墩:</h3>
                        <DropZone zoneId="front" cardsInZone={frontZone} onDropCard={handleDropCard} acceptType={ItemTypes.CARD} maxCards={3} title="头道" />
                        <DropZone zoneId="middle" cardsInZone={middleZone} onDropCard={handleDropCard} acceptType={ItemTypes.CARD} maxCards={5} title="中道" />
                        <DropZone zoneId="back" cardsInZone={backZone} onDropCard={handleDropCard} acceptType={ItemTypes.CARD} maxCards={5} title="尾道" />
                        <br />
                        <button onClick={handleAiArrange}>AI分牌</button>
                        <button onClick={handleSubmitCards} disabled={frontZone.length !== 3 || middleZone.length !== 5 || backZone.length !== 5}>
                            提交牌型
                        </button>
                    </>
                )}

                {gameState && gameState.status === 'finished' && (
                    <div>
                        <h3>游戏结束 - 结果:</h3>
                        {/* Display results from gameState.results */}
                        {gameState.results.map(res => (
                            <div key={res.userId}>
                                <p>玩家 {res.userId}: 得分 {res.points_change}</p>
                                {/* Display res.arranged_cards and res.scores details */}
                            </div>
                        ))}
                    </div>
                )}
                 {/* Message Log */}
                <div>
                    <h4>消息日志:</h4>
                    <div style={{ height: '100px', overflowY: 'scroll', border: '1px solid #ccc', padding: '5px' }}>
                        {messages.map((msg, index) => (
                            <p key={index} style={{ margin: '2px 0', fontSize: '0.8em' }}>
                                <small>{new Date().toLocaleTimeString()}: {JSON.stringify(msg)}</small>
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </DndProvider>
    );
};

export default GamePage;
