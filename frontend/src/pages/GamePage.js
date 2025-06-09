// frontend/src/pages/GamePage.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; 
import { useAuth } from '../contexts/AuthContext';
// connectSocket, sendSocketMessage, getSocket 都会在 useEffect 和事件处理器中使用
import { connectSocket, sendSocketMessage, getSocket } from '../services/socket'; 
import OriginalCardComponent from '../components/Game/Card'; // 在 DraggableCard 中使用
import { DndProvider, useDrag, useDrop } from 'react-dnd';    // 在顶层和自定义 Hook 中使用
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
// aiArrangeCards 在 handleAiArrange 中使用
import { 十三水AI简易分牌 as aiArrangeCards } from '../utils/thirteenWaterLogic';

// ItemTypes 在 DraggableCard 和 DropZone 中使用
const ItemTypes = { CARD: 'card' };

// DraggableCard 组件定义 (内部使用了 OriginalCardComponent 和 ItemTypes)
const DraggableCard = ({ cardId, currentZone }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.CARD,
        item: { cardId, fromZone: currentZone },
        collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }), [cardId, currentZone]);

    return (
        <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1, cursor: 'move', display: 'inline-block', margin: '2px' }}>
            <OriginalCardComponent cardId={cardId} isDraggable={true} /> 
        </div>
    );
};

// DropZone 组件定义 (内部使用了 DraggableCard 和 ItemTypes)
const DropZone = ({ zoneId, title, cardsInZone, onDropCard, maxCards, className }) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.CARD,
        drop: (item) => {
            if (cardsInZone.length < maxCards) {
                onDropCard(item.cardId, item.fromZone, zoneId);
            } else {
                console.log(`Zone ${title} (${zoneId}) is full.`);
            }
        },
        canDrop: () => cardsInZone.length < maxCards,
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    }), [cardsInZone, maxCards, onDropCard, zoneId, title]);

    let backgroundColor = '#f0f0f0';
    if (isOver && canDrop) backgroundColor = 'lightgreen';
    else if (isOver && !canDrop) backgroundColor = 'lightcoral';

    return (
        <div ref={drop} className={`drop-zone ${className || ''}`} style={{ border: '2px dashed gray', minHeight: '120px', padding: '10px', margin: '5px', backgroundColor, borderRadius: '5px' }}>
            <strong>{title} ({cardsInZone.length}/{maxCards})</strong>
            <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                {cardsInZone.map(cId => (
                    <DraggableCard key={cId} cardId={cId} currentZone={zoneId} />
                ))}
            </div>
        </div>
    );
};


const GamePage = () => {
    const { user } = useAuth();
    const { roomId: roomIdFromUrl } = useParams(); // 被 useEffect 和渲染逻辑使用
    const navigate = useNavigate(); // 被 handleSocketMessage 和 useEffect 使用

    const [gameState, setGameState] = useState({ 
        status: 'connecting_ws', players: [], myCards: [], isHost: false,        
        currentRoomId: null, results: null, errorMessage: null 
    }); // gameState 和 setGameState 都会被使用
    
    const [handZone, setHandZone] = useState([]); // 被 DropZone, handleAiArrange, handleSocketMessage (game_started) 使用
    const [frontZone, setFrontZone] = useState([]); // 被 DropZone, handleSubmitCards, handleAiArrange, handleSocketMessage (game_started) 使用
    const [middleZone, setMiddleZone] = useState([]); // 被 DropZone, handleSubmitCards, handleAiArrange, handleSocketMessage (game_started) 使用
    const [backZone, setBackZone] = useState([]);   // 被 DropZone, handleSubmitCards, handleAiArrange, handleSocketMessage (game_started) 使用
    
    const [messages, setMessages] = useState([]); // 被 processAndLogMessage 和 JSX 使用
    const [isSocketConnected, setIsSocketConnected] = useState(false); // 被 useEffect, handleStartGame 和 JSX 使用
    
    const isMountedRef = useRef(true); // 被 useEffect 和 handleSocketMessage 使用
    const socketMessageListenerRef = useRef(null); // 被 useEffect 使用

    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const DnDBackend = isTouchDevice() ? TouchBackend : HTML5Backend; // 被 DndProvider 使用

    const processAndLogMessage = useCallback((msg) => {
        console.log('GamePage RAW MSG:', msg);
        if (isMountedRef.current) {
            setMessages(prev => [{ timestamp: new Date().toLocaleTimeString(), data: msg }, ...prev.slice(0, 49)]);
        }
    }, []); // setMessages 是 useState 返回的，其引用是稳定的

    const handleSocketMessage = useCallback((msg) => {
        processAndLogMessage(msg); 
        if (!isMountedRef.current) return;

        switch (msg.type) {
            case 'connection_ack': 
                console.log("GamePage: Received connection_ack. Sending user_auth_and_ready.");
                if (user && user.id) {
                    sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
                    setGameState(prev => ({ ...prev, status: 'authenticating_ws' })); 
                } else {
                    console.error("GamePage: User data not available for user_auth_and_ready.");
                    setGameState(prev => ({ ...prev, status: 'error', errorMessage: '用户信息丢失，无法开始游戏' }));
                }
                break;
            case 'joined_room':
                if (msg.roomId && msg.roomId.toUpperCase() === (roomIdFromUrl || '').toUpperCase()) { // 添加 roomIdFromUrl 判空
                    setGameState(prev => ({ 
                        ...prev, status: msg.gameState || 'waiting', 
                        players: msg.players || [], isHost: msg.isHost || false,
                        currentRoomId: msg.roomId, errorMessage: null
                    }));
                } else { 
                    console.warn("GamePage: Joined a different room or roomId mismatch. Expected:", roomIdFromUrl, "Actual:", msg.roomId);
                    if (isMountedRef.current) navigate("/lobby"); 
                }
                break;
            case 'player_joined':
            case 'player_left':
            case 'new_host':
                setGameState(prev => ({ 
                    ...prev, 
                    players: msg.players || [],
                    isHost: msg.hostUserId ? (user && user.id === msg.hostUserId) : prev.isHost
                }));
                if (msg.type === 'new_host' && isMountedRef.current) alert(`玩家 ${msg.hostUserId} 现在是房主。`);
                break;
            case 'game_started':
                setHandZone(msg.your_cards || []);
                setFrontZone([]); setMiddleZone([]); setBackZone([]);
                setGameState(prev => ({ 
                    ...prev, status: 'arranging', myCards: msg.your_cards || [],
                    players: (msg.players || []).map(participantId => ({
                        id: participantId, 
                        isAi: (msg.aiPlayers || []).includes(participantId),
                        isHost: participantId === user?.id, 
                        ready: (msg.aiPlayers || []).includes(participantId) 
                    })),
                    currentRoomId: msg.roomId || 'ai_game', 
                    errorMessage: null
                }));
                break;
            case 'cards_submitted': 
                if(isMountedRef.current) alert(msg.message); 
                if(isMountedRef.current && user) setGameState(prev => ({ ...prev, players: prev.players.map(p => p.id === user.id ? {...p, ready: true} : p) }));
                break;
            case 'player_ready':
                 if(isMountedRef.current) setGameState(prev => ({ ...prev, players: prev.players.map(p => p.id === msg.userId ? { ...p, ready: true } : p) }));
                break;
            case 'game_over': 
                if(isMountedRef.current) {
                    setGameState(prev =>({ ...prev, status: 'finished', results: msg.results, myCards: [] }));
                    setHandZone([]); 
                    alert("游戏结束! 请查看结果。");
                }
                break;
            case 'game_cancelled':
                if(isMountedRef.current) {
                    alert(msg.message || "游戏已取消");
                    setGameState(prev => ({ ...prev, status: 'waiting', game: null, myCards: [], results: null}));
                    setHandZone([]); setFrontZone([]); setMiddleZone([]); setBackZone([]);
                }
                break;
            case 'error':
                console.error("GamePage: Game Error from server:", msg.message);
                if(isMountedRef.current) {
                    setGameState(prev => ({ ...prev, status: 'error', errorMessage: msg.message }));
                    if (msg.message && msg.message.toLowerCase().includes("room") && msg.message.toLowerCase().includes("not exist")) {
                        navigate("/lobby"); 
                    }
                }
                break;
            default:
                console.log("GamePage: Unknown message type received:", msg.type, msg);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps 
    }, [user?.id, processAndLogMessage, navigate, roomIdFromUrl]); // 移除了 gameState 相关的依赖，因为 setGameState 的函数形式可以访问到最新的 prev state

    useEffect(() => {
        isMountedRef.current = true;
        let localSocketInstance = null; 

        socketMessageListenerRef.current = (event) => {
            try {
                const parsedMessage = JSON.parse(event.data);
                if (isMountedRef.current) { 
                    handleSocketMessage(parsedMessage);
                }
            } catch (e) {
                console.error("GamePage: Error parsing raw message data in listener", e, event.data);
            }
        };

        if (user && user.id && roomIdFromUrl) { 
            let currentSocket = getSocket();
            if (!isSocketConnected || !currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
                console.log(`GamePage: User ${user.id} - Socket not open or not connected. Attempting to connect for room ${roomIdFromUrl}.`);
                setGameState(prev => ({...prev, status: 'connecting_ws'}));
                localSocketInstance = connectSocket(
                    user.id, 
                    null, 
                    () => { 
                        if (!isMountedRef.current) return;
                        console.log(`GamePage: Socket opened for room ${roomIdFromUrl}. Adding listener & waiting for connection_ack.`);
                        setIsSocketConnected(true); 
                        const freshSocket = getSocket();
                        if (freshSocket && socketMessageListenerRef.current) {
                            freshSocket.removeEventListener('message', socketMessageListenerRef.current); 
                            freshSocket.addEventListener('message', socketMessageListenerRef.current);
                        }
                    },
                    (event) => { 
                        if (isMountedRef.current) {
                            setIsSocketConnected(false); 
                            setGameState(prev => ({ ...prev, status: 'disconnected', errorMessage: `与服务器断开连接 (Code: ${event.code})`})); 
                            console.log("GamePage: Socket closed.");
                        } 
                    },
                    (err) => { 
                        if (isMountedRef.current) {
                            setIsSocketConnected(false); 
                            setGameState(prev => ({ ...prev, status: 'error', errorMessage: "WebSocket连接错误: " + err.message })); 
                            console.error("GamePage: Socket conn error.");
                        } 
                    }
                );
            } else { 
                console.log(`GamePage: User ${user.id} - Socket already open. Ensuring listener.`);
                // setIsSocketConnected(true); // 已在上面分支的 onOpen 中设置
                if (socketMessageListenerRef.current && currentSocket) { 
                    currentSocket.removeEventListener('message', socketMessageListenerRef.current); 
                    currentSocket.addEventListener('message', socketMessageListenerRef.current);
                }
                // 如果已连接但游戏未开始或状态不对，重新发送认证/加入消息
                if (gameState.status === 'connecting_ws' || gameState.status === 'disconnected' || 
                    gameState.status === 'authenticating_ws' || gameState.currentRoomId !== roomIdFromUrl.toUpperCase()) {
                     if (user && user.id) {
                        // 如果是 AI 游戏模式，发送 user_auth_and_ready
                        // 如果是房间模式，发送 join_room
                        // 这里我们假设是 AI 游戏模式（因为 roomIdFromUrl 不再是核心）
                        // 或者，如果 roomIdFromUrl 仍然用于区分不同 AI 游戏实例，则发送 join_room
                        // 根据你最新的后端 GameHandler，GamePage 现在是自动 AI 游戏，所以应该是 user_auth_and_ready
                        // 但如果 App.js 导航到 /game (没有roomId)，GamePage 可能需要一个默认行为
                        // 为了兼容之前的 LobbyPage -> GamePage/:roomId 流程，我们保留 join_room
                        if (roomIdFromUrl) { // 如果 URL 中有 roomId，则加入该房间
                             sendSocketMessage({ type: 'join_room', roomId: roomIdFromUrl, userId: user.id });
                        } else { // 否则，是自动AI游戏
                             sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
                             setGameState(prev => ({ ...prev, status: 'authenticating_ws' }));
                        }
                    }
                }
            }
        } else if (!roomIdFromUrl && user && isMountedRef.current && gameState.status !== 'arranging' && gameState.status !== 'finished') { // 自动AI游戏逻辑
            console.warn("GamePage: No roomId in URL, initiating AI game sequence.");
            // 确保 socket 连接，然后发送 user_auth_and_ready
            let currentSocket = getSocket();
            if (!isSocketConnected || !currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
                 connectSocket(user.id, null, () => {
                    if (!isMountedRef.current) return;
                    setIsSocketConnected(true);
                    const freshSocket = getSocket();
                    if (freshSocket && socketMessageListenerRef.current) {
                        freshSocket.removeEventListener('message', socketMessageListenerRef.current);
                        freshSocket.addEventListener('message', socketMessageListenerRef.current);
                    }
                    sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
                    setGameState(prev => ({ ...prev, status: 'authenticating_ws' }));
                 });
            } else {
                sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
                setGameState(prev => ({ ...prev, status: 'authenticating_ws' }));
            }
        }
        
        return () => {
            isMountedRef.current = false;
            const socketToCleanup = localSocketInstance || getSocket();  
            if (socketToCleanup && socketMessageListenerRef.current) {
                console.log(`GamePage: Cleaning up message listener for room ${roomIdFromUrl}.`);
                socketToCleanup.removeEventListener('message', socketMessageListenerRef.current);
            }
        };
    // **修正依赖数组**
    }, [user, roomIdFromUrl, navigate, handleSocketMessage, isSocketConnected, gameState.status, gameState.currentRoomId]);


    const handleDropCard = (cardId, fromZoneId, toZoneId) => { /* ... (与之前版本一致) ... */ };
    const handleStartGame = () => { /* ... (与之前版本一致, 确保使用了 gameState.players.length) ... */ };
    const handleSubmitCards = () => { /* ... (与之前版本一致, 使用 gameState.currentRoomId) ... */ };
    const handleAiArrange = () => { /* ... (与之前版本一致, 使用 gameState.myCards) ... */ };

    if (!user) return <p>请先登录才能进入游戏室...</p>;
    // 如果是自动AI游戏，roomIdFromUrl 可能为空
    // if (!roomIdFromUrl && gameState.status !== 'arranging' && gameState.status !== 'finished' && gameState.status !== 'waiting' && gameState.status !== 'authenticating_ws' && gameState.status !== 'connecting_ws' && gameState.status !== 'error') {
    //     return <p>正在准备您的 AI 牌局...</p>; // 或者直接显示连接中
    // }

    let gameContent;
    // (switch gameState.status for gameContent - 使用之前提供的完整版本)
    // ... (确保所有 case 都覆盖，并且 JSX 中引用的变量和函数都已定义并被 ESLint 识别) ...
    if (gameState.status === 'arranging') {
        const amIReady = gameState.players.find(p => p.id === user.id && !p.isAi)?.ready;
        const aiPlayersInfo = gameState.players.filter(p => p.isAi).map(p => `${p.id}${p.ready ? '(已出牌)' : '(思考中)'}`).join(', ');
        gameContent = ( /* ... JSX for arranging ... */ );
    } else if (gameState.status === 'waiting') { /* ... JSX for waiting ... */ }
    else if (gameState.status === 'finished' && gameState.results) { /* ... JSX for finished ... */ }
    else if (gameState.status === 'error') { /* ... JSX for error ... */ }
    else { /* ... JSX for connecting/disconnected/authenticating ... */ }

    return (
        <DndProvider backend={DnDBackend}>
            <div>
                <h2>十三水游戏房间: {gameState.currentRoomId || roomIdFromUrl || 'AI对战'}</h2>
                <p>玩家: {user.phone_number} (积分: {user.points}) - Socket: {isSocketConnected ? '已连接' : '未连接'}</p>
                {gameContent}
                <div style={{marginTop: '30px'}}>
                    <h4>游戏消息日志 (最新50条):</h4>
                    <div style={{ height: '150px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', background: '#f9f9f9', fontSize: '0.9em' }}>
                        {(messages || []).map((msg, index) => (
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
