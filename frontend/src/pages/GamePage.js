// frontend/src/pages/GamePage.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Link 可能会在错误状态等地方用到
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
    const { user } = useAuth();
    const { roomId: roomIdFromUrl } = useParams(); // 在 AI 模式下，这个可能为 undefined
    const navigate = useNavigate();

    const [gameState, setGameState] = useState({ 
        status: 'idle', // 改为 idle，连接在 useEffect 中处理
        players: [], myCards: [], isHost: false,        
        currentRoomId: null, results: null, errorMessage: null 
    });
    
    const [handZone, setHandZone] = useState([]);
    const [frontZone, setFrontZone] = useState([]);
    const [middleZone, setMiddleZone] = useState([]);
    const [backZone, setBackZone] = useState([]);
    
    const [messages, setMessages] = useState([]);
    const [isSocketConnected, setIsSocketConnected] = useState(false); 
    
    const isMountedRef = useRef(true);
    // socketMessageListenerRef 不再需要，因为 onMessageCallback 直接在 connectSocket 中设置
    // const socketMessageListenerRef = useRef(null); 

    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const DnDBackend = isTouchDevice() ? TouchBackend : HTML5Backend;

    // processAndLogMessage 依赖 setMessages，但 setMessages 是稳定的
    const processAndLogMessage = useCallback((msg) => {
        console.log('GamePage RAW MSG:', msg);
        if (isMountedRef.current) {
            setMessages(prev => [{ timestamp: new Date().toLocaleTimeString(), data: msg }, ...prev.slice(0, 49)]);
        }
    }, []); // 空依赖数组，因为 setMessages 是稳定的

    const handleSocketMessage = useCallback((msg) => {
        processAndLogMessage(msg); 
        if (!isMountedRef.current) return;

        // 这里的 setGameState 依赖于 user 和 roomIdFromUrl (如果用到的话)
        // 为了简化，我们假设 user 和 roomIdFromUrl 在这个回调的作用域内是稳定的（通过 useCallback 的依赖传递）
        // 否则，每次 user 或 roomIdFromUrl 变化，这个回调也需要重新创建

        switch (msg.type) {
            case 'connection_ack': 
                console.log("GamePage: Received connection_ack. Sending user_auth_and_ready.");
                if (user && user.id) { // 确保 user 存在
                    sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
                    setGameState(prev => ({ ...prev, status: 'authenticating_ws' })); 
                } else {
                    console.error("GamePage: User data not available when trying to send user_auth_and_ready.");
                    setGameState(prev => ({ ...prev, status: 'error', errorMessage: '用户信息丢失，无法开始游戏' }));
                }
                break;
            // ... (其他 case 与之前版本类似，确保它们正确调用 setGameState, setHandZone 等)
            // 例如 game_started:
            case 'game_started':
                console.log("GamePage: Game started! My cards:", msg.your_cards, "All participants:", msg.players, "AI Players:", msg.aiPlayers);
                if(isMountedRef.current) {
                    setHandZone(msg.your_cards || []);
                    setFrontZone([]); setMiddleZone([]); setBackZone([]);
                    setGameState(prev => ({ 
                        ...prev, status: 'arranging', myCards: msg.your_cards || [],
                        players: (msg.players || []).map(participantId => ({
                            id: participantId, 
                            isAi: (msg.aiPlayers || []).includes(participantId),
                            // 在纯AI模式下，真实玩家是 host
                            isHost: (user && participantId === user.id && !(msg.aiPlayers || []).includes(participantId)), 
                            ready: (msg.aiPlayers || []).includes(participantId) 
                        })),
                        currentRoomId: msg.roomId || 'ai_game', 
                        errorMessage: null
                    }));
                }
                break;
            // ... (所有其他 case)
            default:
                console.log("GamePage: Unknown message type received:", msg.type, msg);
        }
    // **修正 useCallback 的依赖数组**
    // 包含所有在回调函数体中读取的、并且可能在组件生命周期内改变的外部变量
    // user 对象本身可能会变，所以用 user?.id
    // navigate 和 processAndLogMessage 是通过 useCallback 包裹的，它们的引用是稳定的
    }, [user?.id, navigate, processAndLogMessage, roomIdFromUrl]); // roomIdFromUrl 如果在逻辑中用到也需要

    useEffect(() => {
        isMountedRef.current = true;
        let socketInstance = null; // 用于存储当前 effect 作用域内的 socket 实例

        if (user && user.id) { 
            // roomIdFromUrl 在AI模式下可以不存在，但如果存在，我们会用于加入特定房间
            // 目前我们专注于AI模式，所以 roomIdFromUrl 暂时不作为连接的强依赖

            const currentGlobalSocket = getSocket();
            if (!currentGlobalSocket || currentGlobalSocket.readyState !== WebSocket.OPEN) {
                console.log(`GamePage: User ${user.id} - Socket not open. Attempting to connect.`);
                if (isMountedRef.current) setGameState(prev => ({...prev, status: 'connecting_ws'}));
                
                socketInstance = connectSocket( // 将返回的实例赋值给局部变量
                    user.id, 
                    handleSocketMessage, // 直接传递稳定引用的 handleSocketMessage
                    () => { // onOpen
                        if (!isMountedRef.current) return;
                        console.log(`GamePage: Socket opened. Server should send 'connection_ack'.`);
                        setIsSocketConnected(true); 
                        // 等待服务器的 'connection_ack'，收到后再发送 'user_auth_and_ready'
                    },
                    (event) => { /* onClose */ 
                        if (isMountedRef.current) {
                            setIsSocketConnected(false); 
                            setGameState(prev => ({ ...prev, status: 'disconnected', errorMessage: `与服务器断开连接 (Code: ${event.code})`})); 
                            console.log("GamePage: Socket closed in useEffect.");
                        } 
                    },
                    (err) => { /* onError */ 
                        if (isMountedRef.current) {
                            setIsSocketConnected(false); 
                            setGameState(prev => ({ ...prev, status: 'error', errorMessage: "WebSocket连接错误: " + err.message })); 
                            console.error("GamePage: Socket conn error in useEffect.");
                        } 
                    }
                );
            } else { // Socket 已连接
                console.log(`GamePage: User ${user.id} - Socket already open.`);
                if (isMountedRef.current) setIsSocketConnected(true); 
                
                // 如果 socket 已连接，但游戏状态仍然是初始的 idle 或 connecting_ws，
                // 或者需要重新认证，则发送 user_auth_and_ready
                // (假设AI模式，或者需要一个初始消息来触发游戏)
                if (gameState.status === 'idle' || gameState.status === 'connecting_ws' || gameState.status === 'authenticating_ws') {
                     if (user && user.id) {
                        console.log("GamePage: Socket open, sending user_auth_and_ready for AI game.");
                        sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
                        if (isMountedRef.current) setGameState(prev => ({ ...prev, status: 'authenticating_ws' }));
                    }
                }
                // 确保消息监听器被设置 (connectSocket 现在应该在内部处理这个)
                // currentGlobalSocket.removeEventListener('message', handleSocketMessage); // 如果之前有，先移除
                // currentGlobalSocket.addEventListener('message', handleSocketMessage);
            }
        }
        
        return () => {
            isMountedRef.current = false;
            console.log("GamePage: useEffect cleanup function running.");
            // GamePage 卸载时不主动关闭全局 socket，除非有特定逻辑要求
            // 如果 socketInstance 是在这个 effect 中创建的，并且只想让它在这个组件生命周期内有效，则关闭
            // if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
            //     console.log("GamePage: Closing socket instance created in this effect.");
            //     socketInstance.close();
            // }
            // 通常，全局 socket 的管理（如登出时关闭）应该在更高层或 AuthContext 中处理。
        };
    // **修正 useEffect 的依赖数组**
    // user 对象本身是依赖项。isSocketConnected 的变化也应该触发 effect。
    // roomIdFromUrl 如果用于加入特定房间，也应是依赖。
    // handleSocketMessage 现在是 useCallback 包裹的，其引用是否稳定取决于它的依赖。
    }, [user, roomIdFromUrl, navigate, handleSocketMessage, isSocketConnected]); // 保持 isSocketConnected


    // ... (handleDropCard, handleSubmitCards, handleAiArrange 与之前版本一致) ...
    const handleDropCard = (cardId, fromZoneId, toZoneId) => { /* ... */ };
    const handleStartNewAIGame = () => { /* ... (与之前版本一致) ... */ };
    const handleSubmitCards = () => { /* ... (与之前版本一致) ... */ };
    const handleAiArrange = () => { /* ... (与之前版本一致) ... */ };


    if (!user) return <p>请先登录才能进入游戏室...</p>;
    
    // ... (gameContent 的 switch 语句和 return JSX 与之前版本一致) ...
    // (为简洁起见，这里省略，请确保你使用的是我上一条回复中的完整 JSX 渲染逻辑)
    let gameContent;
    // ... (完整的 switch case for gameContent) ...
    return ( <DndProvider backend={DnDBackend}> {/* ... 完整的 JSX ... */} </DndProvider> );
};
export default GamePage;
