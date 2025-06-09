// frontend/src/pages/GamePage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext'; // 假设路径正确
import { connectSocket, sendSocketMessage, closeSocket, getSocket } from '../services/socket'; // 假设路径正确
import Card from '../components/Game/Card'; // 假设路径正确
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend'; // For touch devices
// 确保这个文件存在且路径正确
// 如果 thirteenWaterLogic.js 中有未使用的变量，也需要处理
import { 十三水AI简易分牌 } from '../utils/thirteenWaterLogic';

const ItemTypes = { CARD: 'card' };

// Draggable Card Component
const DraggableCard = ({ id, cardId, currentZone }) => { // 移除了 onDropCard，因为它不属于 DraggableCard 的 props
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.CARD,
        item: { id, cardId, zone: currentZone },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1, cursor: 'move', display: 'inline-block', margin: '2px' }}>
            <Card cardId={cardId} idForDnd={id} isDraggable={true} /> {/* 传递 idForDnd 和 isDraggable */}
        </div>
    );
};

// Drop Zone Component
const DropZone = ({ zoneId, cardsInZone, onDropCard, acceptType, maxCards, title }) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({ // 添加 canDrop
        accept: acceptType,
        drop: (item) => {
            if (cardsInZone.length < maxCards) {
                onDropCard(item.cardId, item.zone, zoneId);
            } else {
                console.log(`Zone ${zoneId} is full.`);
            }
        },
        canDrop: (item) => cardsInZone.length < maxCards, // 只有在区域未满时才能放置
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(), // 收集 canDrop 状态
        }),
    }), [cardsInZone, maxCards, onDropCard, zoneId, acceptType]); // 添加依赖

    let backgroundColor = 'white';
    if (isOver && canDrop) {
        backgroundColor = 'lightgreen';
    } else if (isOver && !canDrop) {
        backgroundColor = 'lightcoral'; // 区域满且悬停时显示不同颜色
    }


    return (
        <div ref={drop} style={{ border: '1px dashed gray', minHeight: '110px', minWidth: '150px', padding: '10px', margin: '10px', backgroundColor }}>
            <strong>{title} ({cardsInZone.length}/{maxCards})</strong>
            <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap' }}> {/* 使用 flex 布局卡牌 */}
                {cardsInZone.map(cId => ( // 确保每个 DraggableCard 有唯一的 key
                    <DraggableCard key={cId} id={cId} cardId={cId} currentZone={zoneId} />
                ))}
            </div>
        </div>
    );
};


const GamePage = () => {
    const { user } = useAuth();
    const [gameState, setGameState] = useState(null);
    const [myCards, setMyCards] = useState([]);
    const [handZone, setHandZone] = useState([]);
    const [frontZone, setFrontZone] = useState([]);
    const [middleZone, setMiddleZone] = useState([]);
    const [backZone, setBackZone] = useState([]);
    
    // roomId 现在是固定的，所以不需要 setRoomId
    // 如果 roomId 需要从 URL 参数或用户输入获取，则需要保留 useState 和 setRoomId
    const [roomId] = useState('default_room'); // 移除 setRoomId，因为未使用
    // const [roomId, setRoomId] = useState('default_room'); // 如果未来需要设置roomId，则保留此行并使用setRoomId

    const [messages, setMessages] = useState([]);

    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const DnDBackend = isTouchDevice() ? TouchBackend : HTML5Backend;

    const handleSocketMessage = useCallback((msg) => {
        setMessages(prev => [{ timestamp: new Date().toLocaleTimeString(), data: msg }, ...prev.slice(0, 49)]); // 保留最近50条消息
        console.log('Socket Message Received:', msg);
        switch (msg.type) {
            case 'system':
                console.log("System message:", msg.message);
                break;
            case 'joined_room':
                console.log("Joined room:", msg.roomId, "Players:", msg.players);
                // 更新玩家列表UI
                setGameState(prev => ({ ...prev, players: msg.players, status: prev?.status || 'waiting' }));
                break;
            case 'player_joined':
                console.log("Player joined:", msg.userId, "Players:", msg.players);
                setGameState(prev => ({ ...prev, players: msg.players }));
                break;
            case 'player_left':
                console.log("Player left:", msg.userId, "Remaining players:", msg.remainingPlayers);
                 setGameState(prev => ({ ...prev, players: msg.remainingPlayers?.map(id => ({id})) || [] })); // 简化处理
                break;
            case 'game_started':
                setMyCards(msg.your_cards);
                setHandZone(msg.your_cards);
                setFrontZone([]);
                setMiddleZone([]);
                setBackZone([]);
                setGameState({ status: 'arranging', players: msg.players.map(id => ({id})) }); // 假设 players 是 id 数组
                console.log("Game started! Your cards:", msg.your_cards);
                break;
            case 'cards_submitted':
                alert(msg.message);
                break;
            case 'game_over':
                setGameState({ status: 'finished', results: msg.results });
                alert("Game Over! Check results.");
                console.log("Game results:", msg.results);
                break;
            case 'player_ready':
                console.log(`Player ${msg.userId} is ready.`);
                // 可以更新UI以显示哪些玩家已准备好
                setGameState(prev => {
                    if (!prev || !prev.players) return prev;
                    const updatedPlayers = prev.players.map(p => 
                        p.id === msg.userId ? { ...p, ready: true } : p
                    );
                    return { ...prev, players: updatedPlayers };
                });
                break;
            case 'error':
                console.error("Game Error:", msg.message);
                alert(`Error: ${msg.message}`);
                break;
            default:
                console.log("Unknown message type:", msg);
        }
    }, []); 

    useEffect(() => {
        if (user && user.id) {
            connectSocket(
                user.id,
                handleSocketMessage,
                () => { 
                    console.log("Socket opened, joining room:", roomId, "for user:", user.id);
                    sendSocketMessage({ type: 'join_room', roomId: roomId, userId: user.id });
                },
                () => console.log("Socket closed"),
                (err) => console.error("Socket error", err)
            );
        }
        return () => {
            if (getSocket()) {
                console.log("GamePage unmounting, leaving room:", roomId, "for user:", user?.id);
                sendSocketMessage({ type: 'leave_room', roomId: roomId, userId: user?.id });
                closeSocket();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps 
    }, [user, roomId]); // roomId 现在是常量，但如果它是 prop 或 state，则应包含。handleSocketMessage 是用 useCallback 包裹的

    const handleDropCard = (cardId, fromZoneId, toZoneId) => {
        if (fromZoneId === toZoneId) return;

        let cardToMove = cardId;
        const sourceZones = { hand: handZone, front: frontZone, middle: middleZone, back: backZone };
        const setSourceZones = { hand: setHandZone, front: setFrontZone, middle: setMiddleZone, back: setBackZone };
        
        // 从源区域移除
        if (setSourceZones[fromZoneId]) {
            setSourceZones[fromZoneId](prev => prev.filter(c => c !== cardToMove));
        }

        // 添加到目标区域
        const targetZoneLimit = { hand: 13, front: 3, middle: 5, back: 5 };
        if (setSourceZones[toZoneId] && sourceZones[toZoneId].length < targetZoneLimit[toZoneId]) {
            setSourceZones[toZoneId](prev => [...prev, cardToMove]);
        } else {
            // 如果目标区域已满或无效，则将卡牌放回原区域（或手牌区作为备用）
            console.warn(`Cannot move ${cardToMove} to ${toZoneId}. Zone full or invalid. Returning to ${fromZoneId}.`);
            if (setSourceZones[fromZoneId]) {
                 setSourceZones[fromZoneId](prev => [...prev, cardToMove]); // 放回原处
            } else {
                 setHandZone(prev => [...prev, cardToMove]); // 备用：放回手牌
            }
        }
    };

    const handleStartGame = () => {
        if (!user || !user.id) {
            alert("请先登录！");
            return;
        }
        sendSocketMessage({ type: 'start_game', roomId: roomId, userId: user.id });
    };

    const handleSubmitCards = () => {
        if (frontZone.length !== 3 || middleZone.length !== 5 || backZone.length !== 5) {
            alert("牌墩数量不正确！头道3张，中道5张，尾道5张。");
            return;
        }
        // TODO: 可在此处添加前端牌型校验逻辑 (头道 < 中道 < 尾道)
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
            try {
                const arrangement = 十三水AI简易分牌(myCards); // 确保 myCards 是字符串ID数组
                if(arrangement && arrangement.front && arrangement.middle && arrangement.back) {
                    setFrontZone(arrangement.front);
                    setMiddleZone(arrangement.middle);
                    setBackZone(arrangement.back);
                    setHandZone([]); 
                } else {
                    alert("AI分牌失败，返回结果无效。");
                }
            } catch (error) {
                console.error("AI分牌时发生错误:", error);
                alert("AI分牌时发生错误，请查看控制台。");
            }
        } else {
            alert("没有足够的牌进行AI分牌。请先开始游戏。");
        }
    };

    if (!user) return <p>请先登录才能进入游戏室...</p>;
    if (!gameState && myCards.length === 0) return (
        <div>
            <h2>十三水游戏房间: {roomId}</h2>
            <p>玩家: {user.phone_number} ({user.points} 积分)</p>
            <button onClick={handleStartGame}>开始游戏</button>
            <p>等待游戏开始...</p>
        </div>
    );
    
    return (
        <DndProvider backend={DnDBackend} options={{ enableMouseEvents: !isTouchDevice() }}>
            <div>
                <h2>十三水游戏房间: {roomId}</h2>
                <p>玩家: {user.phone_number} (积分: {user.points})</p>
                {(!gameState || gameState.status === 'waiting' || gameState.status === 'finished') && myCards.length === 0 && (
                    <button onClick={handleStartGame}>开始游戏</button>
                )}

                {gameState && gameState.status === 'arranging' && (
                    <>
                        <h3>你的牌 (拖拽到下面牌墩):</h3>
                        <DropZone zoneId="hand" cardsInZone={handZone} onDropCard={handleDropCard} acceptType={ItemTypes.CARD} maxCards={13} title="手牌区" />
                        
                        <div style={{display: 'flex', justifyContent: 'space-around', marginTop: '20px'}}>
                            <DropZone zoneId="front" cardsInZone={frontZone} onDropCard={handleDropCard} acceptType={ItemTypes.CARD} maxCards={3} title="头道" />
                            <DropZone zoneId="middle" cardsInZone={middleZone} onDropCard={handleDropCard} acceptType={ItemTypes.CARD} maxCards={5} title="中道" />
                            <DropZone zoneId="back" cardsInZone={backZone} onDropCard={handleDropCard} acceptType={ItemTypes.CARD} maxCards={5} title="尾道" />
                        </div>
                        <div style={{marginTop: '20px', textAlign: 'center'}}>
                            <button onClick={handleAiArrange} style={{marginRight: '10px'}}>AI分牌</button>
                            <button onClick={handleSubmitCards} disabled={frontZone.length !== 3 || middleZone.length !== 5 || backZone.length !== 5}>
                                提交牌型
                            </button>
                        </div>
                    </>
                )}

                {gameState && gameState.status === 'finished' && (
                    <div style={{marginTop: '20px', padding: '15px', border: '1px solid green', borderRadius: '5px'}}>
                        <h3>游戏结束 - 结果:</h3>
                        {gameState.results && gameState.results.map((res, index) => (
                            <div key={res.userId || index} style={{borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px'}}>
                                <p><strong>玩家 {res.userId}:</strong> 总得分 {res.points_change}</p>
                                <div>头道: {res.arranged_cards?.front?.join(', ')} (类型: {res.scores?.front_type}, 得分: {res.scores?.front_score})</div>
                                <div>中道: {res.arranged_cards?.middle?.join(', ')} (类型: {res.scores?.middle_type}, 得分: {res.scores?.middle_score})</div>
                                <div>尾道: {res.arranged_cards?.back?.join(', ')} (类型: {res.scores?.back_type}, 得分: {res.scores?.back_score})</div>
                                {res.special_type && <p>特殊牌型: {res.special_type} (加分: {res.scores?.special_score})</p>}
                            </div>
                        ))}
                         <button onClick={handleStartGame} style={{marginTop: '15px'}}>开始新一局</button>
                    </div>
                )}
                <div style={{marginTop: '30px'}}>
                    <h4>游戏消息日志:</h4>
                    <div style={{ height: '150px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', background: '#f9f9f9', fontSize: '0.9em' }}>
                        {messages.map((msg, index) => (
                            <p key={index} style={{ margin: '3px 0', borderBottom: '1px dotted #eee' }}>
                                <small><em>{msg.timestamp}</em></small>: {JSON.stringify(msg.data)}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </DndProvider>
    );
};

export default GamePage;
