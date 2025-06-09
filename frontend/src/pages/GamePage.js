// frontend/src/pages/GamePage.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; 
import { useAuth } from '../contexts/AuthContext';
import { connectSocket, sendSocketMessage, getSocket } from '../services/socket'; 
import OriginalCardComponent from '../components/Game/Card';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { 十三水AI简易分牌 as aiArrangeCards } from '../utils/thirteenWaterLogic';

const ItemTypes = { CARD: 'card' };
const DraggableCard = ({ cardId, currentZone }) => { /* ... (与之前版本一致) ... */ };
const DropZone = ({ zoneId, title, cardsInZone, onDropCard, maxCards, className }) => { /* ... (与之前版本一致) ... */ };

const GamePage = () => {
    const { user } = useAuth(); // user 被使用
    const { roomId: roomIdFromUrl } = useParams(); 
    const navigate = useNavigate(); 

    const [gameState, setGameState] = useState({ 
        status: 'idle', players: [], myCards: [], isHost: false,        
        currentRoomId: null, results: null, errorMessage: null 
    });
    
    const [handZone, setHandZone] = useState([]);
    const [frontZone, setFrontZone] = useState([]);
    const [middleZone, setMiddleZone] = useState([]);
    const [backZone, setBackZone] = useState([]);
    
    const [messages, setMessages] = useState([]);
    const [isSocketConnected, setIsSocketConnected] = useState(false); 
    
    const isMountedRef = useRef(true);
    // socketMessageListenerRef 不再需要在 GamePage 中定义，因为 onMessageCallback 直接传递

    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const DnDBackend = isTouchDevice() ? TouchBackend : HTML5Backend;

    const processAndLogMessage = useCallback((msg) => {
        console.log('GamePage RAW MSG:', msg);
        if (isMountedRef.current) {
            setMessages(prev => [{ timestamp: new Date().toLocaleTimeString(), data: msg }, ...prev.slice(0, 49)]);
        }
    }, []); // setMessages 是稳定的

    // **修改：将 user 添加到 useCallback 的依赖数组**
    const handleSocketMessage = useCallback((msg) => {
        processAndLogMessage(msg); 
        if (!isMountedRef.current) return;

        switch (msg.type) {
            case 'connection_ack': 
                console.log("GamePage: Received connection_ack. Sending user_auth_and_ready.");
                if (user && user.id) { // user 在这里被使用
                    sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
                    setGameState(prev => ({ ...prev, status: 'authenticating_ws' })); 
                } else { 
                    console.error("GamePage: User data not available when trying to send user_auth_and_ready.");
                    setGameState(prev => ({ ...prev, status: 'error', errorMessage: '用户信息丢失，无法开始游戏' }));
                }
                break;
            case 'joined_room':
                if (msg.roomId && msg.roomId.toUpperCase() === (roomIdFromUrl || '').toUpperCase()) { 
                    setGameState(prev => ({ 
                        ...prev, status: msg.gameState || 'waiting', 
                        players: msg.players || [], isHost: msg.isHost || false,
                        currentRoomId: msg.roomId, errorMessage: null
                    }));
                } else { 
                    if (isMountedRef.current && roomIdFromUrl) { // 只有当期望特定房间时才警告和导航
                        console.warn("GamePage: Joined a different room or roomId mismatch. Expected:", roomIdFromUrl, "Actual:", msg.roomId);
                        navigate("/lobby"); 
                    } else if (isMountedRef.current && !roomIdFromUrl && msg.roomId) { // AI 模式下收到了房间信息
                         setGameState(prev => ({ 
                            ...prev, status: msg.gameState || 'waiting', 
                            players: msg.players || [], isHost: msg.isHost || false, // AI 模式下，当前用户是 Host
                            currentRoomId: msg.roomId, errorMessage: null
                        }));
                    }
                }
                break;
            case 'player_joined':
            case 'player_left':
            case 'new_host':
                setGameState(prev => ({ 
                    ...prev, 
                    players: msg.players || [],
                    isHost: msg.hostUserId ? (user && user.id === msg.hostUserId) : prev.isHost // user 在这里被使用
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
                        isHost: (user && participantId === user.id && !(msg.aiPlayers || []).includes(participantId)), // user 在这里被使用
                        ready: (msg.aiPlayers || []).includes(participantId) 
                    })),
                    currentRoomId: msg.roomId || 'ai_game', 
                    errorMessage: null
                }));
                break;
            case 'cards_submitted': 
                if(isMountedRef.current) alert(msg.message); 
                if(isMountedRef.current && user) setGameState(prev => ({ ...prev, players: prev.players.map(p => p.id === user.id ? {...p, ready: true} : p) })); // user 在这里被使用
                break;
            case 'player_ready':
                 if(isMountedRef.current) setGameState(prev => ({ ...prev, players: prev.players.map(p => p.id === msg.userId ? { ...p, ready: true } : p) }));
                break;
            case 'game_over': /* ... (与之前版本一致) ... */ break;
            case 'game_cancelled': /* ... (与之前版本一致) ... */ break;
            case 'error': /* ... (与之前版本一致) ... */ break;
            default:
                console.log("GamePage: Unknown message type received:", msg.type, msg);
        }
    // **修正 useCallback 的依赖数组，加入 user**
    }, [user, processAndLogMessage, navigate, roomIdFromUrl]); // user 对象是依赖

    useEffect(() => {
        isMountedRef.current = true;
        // **localSocketInstance 不再需要赋值，因为 connectSocket 的返回值没有在 effect 主体中使用**
        // let localSocketInstance = null; 

        // socketMessageListenerRef 的赋值移到 connectSocket 成功之后或已连接时
        // socketMessageListenerRef.current = (event) => { ... }; 

        if (user && user.id) { 
            let currentGlobalSocket = getSocket();
            if (!isSocketConnected || !currentGlobalSocket || currentGlobalSocket.readyState !== WebSocket.OPEN) {
                console.log(`GamePage: User ${user.id} - Socket not open or not connected. Attempting to connect.`);
                if (isMountedRef.current) setGameState(prev => ({...prev, status: 'connecting_ws'}));
                
                // **connectSocket 的返回值不再赋给 localSocketInstance**
                connectSocket(
                    user.id, 
                    handleSocketMessage, // 直接传递稳定引用的 handleSocketMessage
                    () => { // onOpen
                        if (!isMountedRef.current) return;
                        console.log(`GamePage: Socket opened. Server should send 'connection_ack'.`);
                        setIsSocketConnected(true); 
                        // socketMessageListenerRef.current = handleSocketMessage; // 不需要，因为已作为回调传入
                    },
                    (event) => { /* onClose */ /* ... */ },
                    (err) => { /* onError */ /* ... */ }
                );
            } else { 
                console.log(`GamePage: User ${user.id} - Socket already open.`);
                if (isMountedRef.current) setIsSocketConnected(true); 
                
                // 确保回调是最新的
                // currentGlobalSocket.removeEventListener('message', socketMessageListenerRef.current); // 旧的移除方式
                // currentGlobalSocket.addEventListener('message', socketMessageListenerRef.current);   // 旧的添加方式
                // 现在 handleSocketMessage 作为回调传给 connectSocket，由 socket.js 内部管理 onmessage
                
                if (gameState.status === 'idle' || gameState.status === 'connecting_ws' || gameState.status === 'authenticating_ws' || 
                   (roomIdFromUrl && gameState.currentRoomId !== roomIdFromUrl.toUpperCase()) ) { // 增加了 roomIdFromUrl 的检查
                     if (user && user.id) {
                        console.log("GamePage: Socket open & initial/mismatched state, sending appropriate message.");
                        if (roomIdFromUrl) { 
                             sendSocketMessage({ type: 'join_room', roomId: roomIdFromUrl, userId: user.id });
                        } else { 
                             sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
                             if (isMountedRef.current) setGameState(prev => ({ ...prev, status: 'authenticating_ws' }));
                        }
                    }
                }
            }
        }
        
        return () => {
            isMountedRef.current = false;
            console.log("GamePage: useEffect cleanup function running.");
            // 清理逻辑：如果 GamePage 自己添加了监听器，则移除。
            // 但由于 handleSocketMessage 作为回调传递，主要清理由 socket.js 或 connectSocket 完成。
            // const socketToCleanup = getSocket();
            // if (socketToCleanup && socketMessageListenerRef.current) {
            //    socketToCleanup.removeEventListener('message', socketMessageListenerRef.current);
            // }
        };
    // 修正 useEffect 的依赖数组
    }, [user, roomIdFromUrl, navigate, handleSocketMessage, isSocketConnected, gameState.status, gameState.currentRoomId]);


    const handleDropCard = (cardId, fromZoneId, toZoneId) => { /* ... (与之前版本一致) ... */ };
    const handleStartNewAIGame = () => { /* ... (与之前版本一致) ... */ };
    const handleSubmitCards = () => { /* ... (与之前版本一致) ... */ };
    const handleAiArrange = () => { /* ... (与之前版本一致) ... */ };

    if (!user) return <p>请先登录才能进入游戏室...</p>;
    
    let gameContent;
    // ... (完整的 switch case for gameContent，与之前版本一致，确保所有状态都被渲染) ...
    
    return ( <DndProvider backend={DnDBackend}> {/* ... 完整的 JSX，确保所有定义的函数和变量都被正确引用 ... */} </DndProvider> );
};
export default GamePage;
