// frontend/src/pages/GamePage.js
import React, { useEffect, useState, useCallback, useRef } from 'react'; // React 需要导入
import { useParams, useNavigate, Link } from 'react-router-dom'; // Link 可能在某些分支中使用
import { useAuth } from '../contexts/AuthContext';
import { connectSocket, sendSocketMessage, getSocket } from '../services/socket'; 
import OriginalCardComponent from '../components/Game/Card'; // 使用导入的 Card
import { DndProvider, useDrag, useDrop } from 'react-dnd'; // 这些会被使用
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
// eslint-disable-next-line no-unused-vars
import { 十三水AI简易分牌 as aiArrangeCards } from '../utils/thirteenWaterLogic'; // aiArrangeCards 被使用

// ItemTypes 在 DraggableCard 和 DropZone 中使用
const ItemTypes = { CARD: 'card' };

// DraggableCard 组件定义
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

// DropZone 组件定义
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
    const { roomId: roomIdFromUrl } = useParams(); // roomIdFromUrl 被使用
    const navigate = useNavigate(); // navigate 被使用

    const [gameState, setGameState] = useState({ 
        status: 'connecting_ws', players: [], myCards: [], isHost: false,        
        currentRoomId: null, results: null, errorMessage: null 
    });
    
    const [handZone, setHandZone] = useState([]); // 被 DropZone 和 handleAiArrange 使用
    const [frontZone, setFrontZone] = useState([]); // 被 DropZone 和 handleSubmitCards, handleAiArrange 使用
    const [middleZone, setMiddleZone] = useState([]); // 被 DropZone 和 handleSubmitCards, handleAiArrange 使用
    const [backZone, setBackZone] = useState([]);   // 被 DropZone 和 handleSubmitCards, handleAiArrange 使用
    
    const [messages, setMessages] = useState([]); // 被 JSX 中的 messages.map 使用
    const [isSocketConnected, setIsSocketConnected] = useState(false); // 被 JSX 和 useEffect, handleStartGame 使用
    
    const isMountedRef = useRef(true);
    const socketMessageListenerRef = useRef(null);

    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const DnDBackend = isTouchDevice() ? TouchBackend : HTML5Backend; // DnDBackend 被 DndProvider 使用

    const processAndLogMessage = useCallback((msg) => {
        console.log('GamePage RAW MSG:', msg);
        if (isMountedRef.current) {
            setMessages(prev => [{ timestamp: new Date().toLocaleTimeString(), data: msg }, ...prev.slice(0, 49)]);
        }
    }, []);

    const handleSocketMessage = useCallback((msg) => {
        processAndLogMessage(msg); 
        if (!isMountedRef.current) return;
        // (switch case 逻辑保持不变, 内部会调用 setGameState)
        switch (msg.type) {
            case 'connection_ack': 
                console.log("GamePage: Received connection_ack. Sending user_auth_and_ready.");
                if (user && user.id) {
                    sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
                    setGameState(prev => ({ ...prev, status: 'authenticating_ws' })); 
                } else { /* ... */ }
                break;
            case 'joined_room': /* ... (内部调用 setGameState) ... */ break;
            case 'player_joined': /* ... (内部调用 setGameState) ... */ break;
            case 'player_left': /* ... (内部调用 setGameState) ... */ break;
            case 'new_host': /* ... (内部调用 setGameState) ... */ break;
            case 'game_started':
                setHandZone(msg.your_cards || []);
                setFrontZone([]); setMiddleZone([]); setBackZone([]);
                setGameState(prev => ({ /* ... */ }));
                break;
            case 'cards_submitted': 
                if(isMountedRef.current) alert(msg.message); 
                if(isMountedRef.current && user) setGameState(prev => ({ /* ... */ }));
                break;
            case 'player_ready':
                 if(isMountedRef.current) setGameState(prev => ({ /* ... */ }));
                break;
            case 'game_over': 
                if(isMountedRef.current) { setGameState(prev =>({ /* ... */ })); setHandZone([]); }
                break;
            case 'game_cancelled':
                if(isMountedRef.current) { setGameState(prev => ({ /* ... */})); setHandZone([]); /* ... */ }
                break;
            case 'error':
                if(isMountedRef.current) { setGameState(prev => ({ /* ... */ })); }
                break;
            default:
                console.log("GamePage: Unknown message type received:", msg.type, msg);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, processAndLogMessage, navigate]); //roomIdFromUrl 被移到下面的useEffect的依赖

    useEffect(() => {
        isMountedRef.current = true;
        // eslint-disable-next-line no-unused-vars
        let localSocketInstance = null; // 重新标记，如果真的没有分支读取它

        socketMessageListenerRef.current = (event) => { /* ... */ }; 

        if (user && user.id && roomIdFromUrl) { 
            let currentSocket = getSocket();
            if (!isSocketConnected || !currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
                console.log(`GamePage: User ${user.id} - Socket not open or not connected. Attempting to connect for room ${roomIdFromUrl}.`);
                setGameState(prev => ({...prev, status: 'connecting_ws'}));
                localSocketInstance = connectSocket( // 赋值
                    user.id, null, 
                    () => { /* ... */ setIsSocketConnected(true); /* ... */ sendSocketMessage({ type: 'join_room', roomId: roomIdFromUrl, userId: user.id }); },
                    (event) => { /* ... */ setIsSocketConnected(false); setGameState(prev => ({ /* ... */ })); },
                    (err) => { /* ... */ setIsSocketConnected(false); setGameState(prev => ({ /* ... */ })); }
                );
            } else { /* ... */ setIsSocketConnected(true); /* ... */ }
        } else if (!roomIdFromUrl && user && isMountedRef.current) { navigate("/lobby");} // LobbyPage 现在存在
        
        return () => {
            isMountedRef.current = false;
            const socketToCleanup = localSocketInstance || getSocket();  
            if (socketToCleanup && socketMessageListenerRef.current) { /* ... */ }
        };
    }, [user, roomIdFromUrl, navigate, handleSocketMessage, isSocketConnected, gameState.currentRoomId, gameState.status]); // 确保依赖完整


    const handleDropCard = (cardId, fromZoneId, toZoneId) => { 
        // 这个函数被 DropZone 的 onDropCard prop 使用
        if (fromZoneId === toZoneId) return;
        const zones = { hand: handZone, front: frontZone, middle: middleZone, back: backZone };
        const setZones = { hand: setHandZone, front: setFrontZone, middle: setMiddleZone, back: setBackZone };
        // ... (其余逻辑)
        if (setZones[fromZoneId] && setZones[toZoneId]) {
            setZones[fromZoneId](prev => prev.filter(id => id !== cardId));
            // ...
        }
    };
    
    const handleStartGame = () => { 
        // 这个函数被 gameContent -> waiting 状态下的按钮 onClick 使用
        if (!user || !user.id) { alert("请先登录！"); return; }
        // ... (其余逻辑)
        sendSocketMessage({ type: 'start_game', roomId: gameState.currentRoomId, userId: user.id });
    };
    
    const handleSubmitCards = () => { 
        // 这个函数被 gameContent -> arranging 状态下的按钮 onClick 使用
        if (frontZone.length !== 3 || middleZone.length !== 5 || backZone.length !== 5) { /* ... */ return; }
        sendSocketMessage({ /* ... */ });
    };
    
    const handleAiArrange = () => { 
        // 这个函数被 gameContent -> arranging 状态下的按钮 onClick 使用
        if (gameState.myCards.length === 13) { 
            const arrangement = aiArrangeCards(gameState.myCards); 
            // ... (其余逻辑)
            setFrontZone(arrangement.front); setMiddleZone(arrangement.middle);
            setBackZone(arrangement.back); setHandZone([]); 
        } else { /* ... */ }
    };

    if (!user) return <p>请先登录才能进入游戏室...</p>;
    if (!roomIdFromUrl && gameState.status !== 'connecting_ws' && gameState.status !== 'authenticating_ws') { // 避免在初始连接时就跳转
        // 如果 GamePage 被直接访问（没有 roomIdFromUrl），并且不是初始连接状态，则导向大厅
        // 如果 LobbyPage 不存在或不想用，可以导向首页或显示错误
        return <p>未指定房间号。请从 <Link to={user ? "/lobby" : "/login"}>入口</Link> 进入房间。</p>;
    }


    let gameContent; // gameContent 在下面被赋值并在 return 中使用
    if (gameState.status === 'error') {
        gameContent = <div><p style={{color: 'red'}}>错误: {gameState.errorMessage}</p><Link to={user ? "/lobby" : "/"}>返回</Link></div>;
    } else if (gameState.status === 'connecting_ws' || (gameState.status === 'disconnected' && !gameState.errorMessage )) {
        gameContent = <p>正在连接到房间 {roomIdFromUrl || '中'}...</p>;
    } else if (gameState.status === 'authenticating_ws') {
        gameContent = <p>正在验证用户并准备游戏...</p>;
    } else if (gameState.status === 'waiting') {
        gameContent = ( /* ... (JSX 使用 handleStartGame) ... */ );
    } else if (gameState.status === 'arranging') {
        // const amIReady = gameState.players.find(p => p.id === user.id)?.ready;
        gameContent = ( /* ... (JSX 使用 DropZone, handleAiArrange, handleSubmitCards) ... */ );
    } else if (gameState.status === 'finished' && gameState.results) {
        // gameContent = ( /* ... (JSX 使用 handleStartGame) ... */ );
    } else {
        gameContent = <p>游戏状态: {gameState.status}. 房间ID: {gameState.currentRoomId || roomIdFromUrl}</p>;
    }
    
    return (
        <DndProvider backend={DnDBackend}> {/* DnDBackend 被使用 */}
            <div>
                <h2>十三水游戏房间: {gameState.currentRoomId || roomIdFromUrl || 'AI对战'}</h2>
                <p>玩家: {user.phone_number} (积分: {user.points}) - 身份: {gameState.isHost ? '房主' : '玩家'} - Socket: {isSocketConnected ? '已连接' : '未连接'}</p>
                {gameContent} {/* gameContent 被使用 */}
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
