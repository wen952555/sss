// frontend/src/pages/GamePage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
// 从下面这行移除了 closeSocket，因为它在 GamePage.js 文件内部没有被直接调用
import { connectSocket, sendSocketMessage, getSocket } from '../services/socket'; 
import Card from '../components/Game/Card';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { 十三水AI简易分牌 } from '../utils/thirteenWaterLogic';

const ItemTypes = { CARD: 'card' };

const DraggableCard = ({ id, cardId, currentZone }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.CARD,
        item: { id, cardId, zone: currentZone },
        collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }));
    return (
        <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1, cursor: 'move', display: 'inline-block', margin: '2px' }}>
            <Card cardId={cardId} idForDnd={id} isDraggable={true} />
        </div>
    );
};

const DropZone = ({ zoneId, cardsInZone, onDropCard, acceptType, maxCards, title }) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: acceptType,
        drop: (item) => {
            if (cardsInZone.length < maxCards) {
                onDropCard(item.cardId, item.zone, zoneId);
            } else {
                console.log(`Zone ${zoneId} is full.`);
            }
        },
        canDrop: () => cardsInZone.length < maxCards,
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    }), [cardsInZone, maxCards, onDropCard, zoneId, acceptType]);

    let backgroundColor = 'white';
    if (isOver && canDrop) backgroundColor = 'lightgreen';
    else if (isOver && !canDrop) backgroundColor = 'lightcoral';

    return (
        <div ref={drop} style={{ border: '1px dashed gray', minHeight: '110px', minWidth: '150px', padding: '10px', margin: '10px', backgroundColor }}>
            <strong>{title} ({cardsInZone.length}/{maxCards})</strong>
            <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap' }}>
                {cardsInZone.map(cId => (
                    <DraggableCard key={cId} id={cId} cardId={cId} currentZone={zoneId} />
                ))}
            </div>
        </div>
    );
};

const GamePage = () => {
    const { user } = useAuth();
    const [gameState, setGameState] = useState({ status: 'disconnected', players: [], gameId: null });
    const [myCards, setMyCards] = useState([]);
    const [handZone, setHandZone] = useState([]);
    const [frontZone, setFrontZone] = useState([]);
    const [middleZone, setMiddleZone] = useState([]);
    const [backZone, setBackZone] = useState([]);
    const [roomId] = useState('default_room');
    const [messages, setMessages] = useState([]);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [hasJoinedRoom, setHasJoinedRoom] = useState(false);

    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const DnDBackend = isTouchDevice() ? TouchBackend : HTML5Backend;

    const handleSocketMessage = useCallback((msg) => {
        setMessages(prev => [{ timestamp: new Date().toLocaleTimeString(), data: msg }, ...prev.slice(0, 49)]);
        console.log('GamePage: Socket Message Received:', msg);
        switch (msg.type) {
            case 'joined_room':
                console.log("GamePage: Joined room:", msg.roomId, "My UserID:", msg.userId, "Players in room:", msg.players);
                setGameState(prev => ({ ...prev, players: msg.players.map(id => ({id, ready: false})), status: 'waiting' }));
                setHasJoinedRoom(true);
                break;
            case 'player_joined':
                console.log("GamePage: Player joined:", msg.userId, "Players:", msg.players);
                setGameState(prev => ({ ...prev, players: msg.players.map(id => ({id, ready: prev.players.find(p=>p.id===id)?.ready || false })) }));
                break;
            case 'player_left':
                console.log("GamePage: Player left:", msg.userId, "Remaining players:", msg.remainingPlayers);
                setGameState(prev => ({ ...prev, players: msg.remainingPlayers?.map(id => ({id, ready: prev.players.find(p=>p.id===id)?.ready || false })) || [] }));
                break;
            case 'game_started':
                console.log("GamePage: Game started! My cards:", msg.your_cards, "All players in game:", msg.players);
                setMyCards(msg.your_cards);
                setHandZone(msg.your_cards);
                setFrontZone([]);
                setMiddleZone([]);
                setBackZone([]);
                setGameState(prev => ({ ...prev, status: 'arranging', players: msg.players.map(id => ({id, ready: false})) }));
                break;
            case 'cards_submitted':
                alert(msg.message);
                break;
            case 'player_ready':
                 console.log(`GamePage: Player ${msg.userId} is ready.`);
                 setGameState(prev => ({
                     ...prev,
                     players: prev.players.map(p => p.id === msg.userId ? { ...p, ready: true } : p)
                 }));
                break;
            case 'game_over':
                setGameState(prev =>({ ...prev, status: 'finished', results: msg.results }));
                alert("Game Over! Check results.");
                console.log("GamePage: Game results:", msg.results);
                setMyCards([]); 
                setHandZone([]);
                break;
            case 'game_cancelled':
                alert(msg.message || "游戏已取消");
                setGameState(prev => ({ ...prev, status: 'waiting', game: null}));
                setMyCards([]);
                setHandZone([]);
                setFrontZone([]);
                setMiddleZone([]);
                setBackZone([]);
                break;
            case 'error':
                console.error("GamePage: Game Error from server:", msg.message);
                alert(`服务器错误: ${msg.message}`);
                break;
            default:
                console.log("GamePage: Unknown message type received:", msg);
        }
    }, []);

    useEffect(() => {
        let localSocketInstance = null; // 本地副本，用于清理函数

        if (user && user.id && !isSocketConnected) {
            console.log("GamePage: User detected, attempting to connect socket.");
            localSocketInstance = connectSocket( // 将返回的socket实例存起来
                user.id,
                handleSocketMessage,
                () => { 
                    console.log("GamePage: Socket opened successfully. Sending join_room...");
                    setIsSocketConnected(true); 
                    sendSocketMessage({ type: 'join_room', roomId: roomId, userId: user.id });
                },
                (event) => { // onClose
                    console.log("GamePage: Socket closed. Reason:", event.reason, "Code:", event.code);
                    setIsSocketConnected(false);
                    setHasJoinedRoom(false);
                    setGameState(prev => ({ ...prev, status: 'disconnected' }));
                },
                (err) => { // onError
                    console.error("GamePage: Socket connection error:", err.message);
                    setIsSocketConnected(false);
                    setHasJoinedRoom(false);
                }
            );
        }
        
        return () => {
            // 使用本地副本 localSocketInstance 或 getSocket() 来判断是否需要关闭
            const socketToClose = localSocketInstance || getSocket(); 
            if (socketToClose && socketToClose.readyState === WebSocket.OPEN) { 
                console.log("GamePage: Unmounting or user changed. Leaving room and attempting to close socket.");
                sendSocketMessage({ type: 'leave_room', roomId: roomId, userId: user?.id });
                // socket.js 中的 closeSocket() 会处理关闭逻辑
                // 我们不需要在 GamePage.js 中再次导入和调用它，除非有特殊需求
                // 让 socket.js 的 onClose 回调来处理状态更新
                socketToClose.close(); // 直接调用 WebSocket 实例的 close 方法
            } else if (socketToClose) { 
                 console.log("GamePage: Unmounting, socket exists but not open (state: "+socketToClose.readyState+"), attempting to close if possible.");
                 if (socketToClose.readyState === WebSocket.CONNECTING) {
                     // 如果正在连接，直接关闭可能会导致错误或意外行为，
                     // 但通常浏览器会处理好。或者可以设置一个标记，在 onOpen 时检查是否需要立即关闭。
                     socketToClose.close();
                 }
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps 
    }, [user, roomId]); // 保持最少的依赖，handleSocketMessage 是 useCallback 包裹的

    const handleDropCard = (cardId, fromZoneId, toZoneId) => {
        if (fromZoneId === toZoneId) return;
        let cardToMove = cardId;
        const zones = { hand: handZone, front: frontZone, middle: middleZone, back: backZone };
        const setZones = { hand: setHandZone, front: setFrontZone, middle: setMiddleZone, back: setBackZone };
        
        if (setZones[fromZoneId]) {
            setZones[fromZoneId](prev => prev.filter(c => c !== cardToMove));
        }
        const targetZoneLimit = { hand: 13, front: 3, middle: 5, back: 5 };
        if (setZones[toZoneId] && zones[toZoneId].length < targetZoneLimit[toZoneId]) {
            setZones[toZoneId](prev => [...prev, cardToMove].sort()); 
        } else {
            console.warn(`Cannot move ${cardToMove} to ${toZoneId}. Zone full or invalid. Returning to ${fromZoneId}.`);
            if (setZones[fromZoneId]) {
                 setZones[fromZoneId](prev => [...prev, cardToMove].sort());
            } else {
                 setHandZone(prev => [...prev, cardToMove].sort());
            }
        }
    };

    const handleStartGame = () => {
        if (!user || !user.id) {
            alert("请先登录！");
            return;
        }
        if (!isSocketConnected) { 
            alert("WebSocket 尚未连接，请稍候...");
            console.warn("GamePage: Attempted to start game, but socket is not connected.");
            return;
        }
        if (!hasJoinedRoom) { 
             alert("尚未成功加入房间，请稍候...");
             console.warn("GamePage: Attempted to start game, but not yet joined room.");
             return;
        }
        console.log("GamePage: Sending start_game message.");
        sendSocketMessage({ type: 'start_game', roomId: roomId, userId: user.id });
    };

    const handleSubmitCards = () => {
        if (frontZone.length !== 3 || middleZone.length !== 5 || backZone.length !== 5) {
            alert("牌墩数量不正确！头道3张，中道5张，尾道5张。");
            return;
        }
        console.log("GamePage: Sending submit_cards message.");
        sendSocketMessage({
            type: 'submit_cards', roomId: roomId, userId: user.id,
            cards: { front: frontZone, middle: middleZone, back: backZone }
        });
    };

    const handleAiArrange = () => {
        if (myCards.length === 13) {
            try {
                const arrangement = 十三水AI简易分牌(myCards); 
                if(arrangement && arrangement.front && arrangement.middle && arrangement.back) {
                    setFrontZone(arrangement.front);
                    setMiddleZone(arrangement.middle);
                    setBackZone(arrangement.back);
                    setHandZone([]); 
                } else { alert("AI分牌失败，返回结果无效。"); }
            } catch (error) {
                console.error("AI分牌时发生错误:", error);
                alert("AI分牌时发生错误，请查看控制台。");
            }
        } else { alert("没有足够的牌进行AI分牌。请先开始游戏。"); }
    };

    if (!user) return <p>请先登录才能进入游戏室...</p>;

    let gameContent;
    switch (gameState.status) {
        case 'disconnected':
            gameContent = <p>正在连接到服务器...</p>;
            break;
        case 'waiting':
            gameContent = (
                <>
                    <p>已连接到房间: {roomId}. 等待其他玩家或开始游戏...</p>
                    <p>当前玩家: {gameState.players.map(p => p.id).join(', ')} (共 {gameState.players.length} 人)</p>
                    <button onClick={handleStartGame} disabled={!isSocketConnected || !hasJoinedRoom || gameState.players.length < (process.env.NODE_ENV === 'development' ? 1 : 2)}>
                        开始游戏 (至少需要 {process.env.NODE_ENV === 'development' ? 1 : 2} 人)
                    </button>
                </>
            );
            break;
        case 'arranging':
            gameContent = (
                <>
                    <h3>你的牌 (拖拽到下面牌墩):</h3>
                    <p>其他已准备玩家: {gameState.players.filter(p=>p.ready && p.id !== user.id).map(p=>p.id).join(', ') || '无'}</p>
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
            );
            break;
        case 'finished':
            gameContent = (
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
                    <button onClick={handleStartGame} disabled={!isSocketConnected || !hasJoinedRoom} style={{marginTop: '15px'}}>开始新一局</button>
                </div>
            );
            break;
        default:
            gameContent = <p>未知游戏状态: {gameState.status}</p>;
    }
    
    return (
        <DndProvider backend={DnDBackend} options={{ enableMouseEvents: !isTouchDevice(), delayTouchStart: 100 }}>
            <div>
                <h2>十三水游戏房间: {roomId}</h2>
                <p>玩家: {user.phone_number} (积分: {user.points}) - Socket: {isSocketConnected ? '已连接' : '未连接'} - 房间: {hasJoinedRoom ? '已加入' : '未加入'}</p>
                {gameContent}
                <div style={{marginTop: '30px'}}>
                    <h4>游戏消息日志 (最新50条):</h4>
                    <div style={{ height: '150px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', background: '#f9f9f9', fontSize: '0.9em' }}>
                        {messages.map((msg, index) => (
                            <p key={index} style={{ margin: '3px 0', borderBottom: '1px dotted #eee', wordBreak: 'break-all' }}>
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
