// frontend/src/pages/GamePage.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; 
import { useAuth } from '../contexts/AuthContext';
import { connectSocket, sendSocketMessage, getSocket } from '../services/socket'; 
import OriginalCardComponent from '../components/Game/Card';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
// eslint-disable-next-line no-unused-vars 
import { 十三水AI简易分牌 as aiArrangeCards } from '../utils/thirteenWaterLogic';

// eslint-disable-next-line no-unused-vars
const ItemTypes = { CARD: 'card' };

// eslint-disable-next-line no-unused-vars
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

// eslint-disable-next-line no-unused-vars
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
                {(cardsInZone || []).map(cId => ( // Defensive check for cardsInZone
                    <DraggableCard key={cId} cardId={cId} currentZone={zoneId} />
                ))}
            </div>
        </div>
    );
};


const GamePage = () => {
    const { user } = useAuth();
    const { roomId: roomIdFromUrl } = useParams();
    const navigate = useNavigate();

    const [gameState, setGameState] = useState({ 
        status: 'connecting_ws', players: [], myCards: [], isHost: false,        
        currentRoomId: null, results: null, errorMessage: null 
    });
    
    const [handZone, setHandZone] = useState([]);
    const [frontZone, setFrontZone] = useState([]);
    const [middleZone, setMiddleZone] = useState([]);
    const [backZone, setBackZone] = useState([]);
    
    const [messages, setMessages] = useState([]); // messages state
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    
    const isMountedRef = useRef(true);
    const socketMessageListenerRef = useRef(null);

    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const DnDBackend = isTouchDevice() ? TouchBackend : HTML5Backend;

    const processAndLogMessage = useCallback((msg) => {
        console.log('GamePage RAW MSG:', msg);
        if (isMountedRef.current) {
            setMessages(prev => [{ timestamp: new Date().toLocaleTimeString(), data: msg }, ...prev.slice(0, 49)]);
        }
    }, []); // setMessages is stable

    const handleSocketMessage = useCallback((msg) => {
        processAndLogMessage(msg); 
        if (!isMountedRef.current) return;
        // (switch case 逻辑与之前版本一致, 内部会调用 setGameState, setHandZone 等)
        switch (msg.type) {
            case 'connection_ack': 
                if (user && user.id) {
                    sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
                    setGameState(prev => ({ ...prev, status: 'authenticating_ws' })); 
                } else { setGameState(prev => ({ ...prev, status: 'error', errorMessage: '用户信息丢失' }));}
                break;
            case 'joined_room': /* ... */ break;
            case 'player_joined': /* ... */ break;
            case 'player_left': /* ... */ break;
            case 'new_host': /* ... */ break;
            case 'game_started':
                setHandZone(msg.your_cards || []);
                setFrontZone([]); setMiddleZone([]); setBackZone([]);
                setGameState(prev => ({ /* ... */ }));
                break;
            case 'cards_submitted': /* ... */ break;
            case 'player_ready': /* ... */ break;
            case 'game_over': /* ... */ break;
            case 'game_cancelled': /* ... */ break;
            case 'error': /* ... */ break;
            default:
                console.log("GamePage: Unknown message type received:", msg.type, msg);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, processAndLogMessage, navigate, roomIdFromUrl]);

    useEffect(() => { /* ... (与之前版本一致, 确保依赖数组正确) ... */ }, [user, roomIdFromUrl, navigate, handleSocketMessage, isSocketConnected, gameState.currentRoomId, gameState.status]);
    
    const handleDropCard = (cardId, fromZoneId, toZoneId) => { /* ... (与之前版本一致) ... */ };
    const handleStartGame = () => { /* ... (与之前版本一致) ... */ };
    const handleSubmitCards = () => { /* ... (与之前版本一致) ... */ };
    const handleAiArrange = () => { /* ... (与之前版本一致) ... */ };

    if (!user) return <p>请先登录才能进入游戏室...</p>;
    if (!roomIdFromUrl && gameState.status !== 'arranging' && gameState.status !== 'finished' && gameState.status !== 'waiting' && gameState.status !== 'authenticating_ws' && gameState.status !== 'connecting_ws' && gameState.status !== 'error') {
        // 自动AI游戏时，如果还没有roomIdFromUrl，且不在进行中或错误状态，可以显示加载
        // return <p>正在准备您的 AI 牌局...</p>; 
    }

    let gameContent;
    // (switch gameState.status for gameContent - 使用之前提供的完整版本)
    // ... (确保所有 case 都覆盖，并且 JSX 中引用的变量和函数都已定义并被 ESLint 识别) ...
    if (gameState.status === 'arranging') {
        // ... (arranging JSX - 确保 DropZone, handleAiArrange, handleSubmitCards 都被使用)
    } else if (gameState.status === 'waiting') {
        // ... (waiting JSX - 确保 handleStartGame 被使用)
    }
    // ... (其他状态)

    return (
        <DndProvider backend={DnDBackend}>
            <div>
                <h2>十三水游戏房间: {gameState.currentRoomId || roomIdFromUrl || 'AI对战'}</h2>
                <p>玩家: {user.phone_number} (积分: {user.points}) - Socket: {isSocketConnected ? '已连接' : '未连接'}</p>
                {/* 确保 gameContent 被赋值和渲染 */}
                {gameContent || <p>游戏内容加载中或状态未知 ({gameState.status})...</p>} 
                <div style={{marginTop: '30px'}}>
                    <h4>游戏消息日志 (最新50条):</h4>
                    <div style={{ height: '150px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', background: '#f9f9f9', fontSize: '0.9em' }}>
                        {/* 第 312 行附近 */}
                        {(messages || []).map((msg, index) => (
                            <p key={index} style={{ margin: '3px 0', borderBottom: '1px dotted #eee', wordBreak: 'break-all' }}>
                                <small><em>{msg && msg.timestamp ? msg.timestamp : 'N/A'}</em></small>: 
                                {msg && typeof msg.data === 'object' ? JSON.stringify(msg.data) : String(msg.data)}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </DndProvider>
    );
};
export default GamePage;
