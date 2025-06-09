// frontend/src/pages/GamePage.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom'; 
import { useAuth } from '../contexts/AuthContext';
import { connectSocket, sendSocketMessage, getSocket } from '../services/socket'; 
import OriginalCardComponent from '../components/Game/Card';
import { DndProvider, useDrag, useDrop } from 'react-dnd'; // 确保导入
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
// eslint-disable-next-line no-unused-vars 
import { 十三水AI简易分牌 as aiArrangeCards } from '../utils/thirteenWaterLogic';

// eslint-disable-next-line no-unused-vars
const ItemTypes = { CARD: 'card' };
// eslint-disable-next-line no-unused-vars
const DraggableCard = ({ cardId, currentZone }) => { /* ... (与之前版本一致) ... */ };
// eslint-disable-next-line no-unused-vars
const DropZone = ({ zoneId, title, cardsInZone, onDropCard, maxCards, className }) => { /* ... (与之前版本一致) ... */ };

const GamePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [gameState, setGameState] = useState({ 
        status: 'connecting_ws', players: [], myCards: [], isHost: false,        
        currentRoomId: null, results: null, errorMessage: null 
    });
    
    const [handZone, setHandZone] = useState([]);
    const [frontZone, setFrontZone] = useState([]);
    const [middleZone, setMiddleZone] = useState([]);
    const [backZone, setBackZone] = useState([]);
    
    // eslint-disable-next-line no-unused-vars
    const [messages, setMessages] = useState([]);
    const [isSocketConnected, setIsSocketConnected] = useState(false); // isSocketConnected 被读取和设置
    
    const isMountedRef = useRef(true);
    const socketMessageListenerRef = useRef(null);

    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const DnDBackend = isTouchDevice() ? TouchBackend : HTML5Backend;

    const processAndLogMessage = useCallback((msg) => {
        console.log('GamePage RAW MSG:', msg);
        if (isMountedRef.current) {
            setMessages(prev => [{ timestamp: new Date().toLocaleTimeString(), data: msg }, ...prev.slice(0, 49)]);
        }
    }, []);

    const handleSocketMessage = useCallback((msg) => {
        processAndLogMessage(msg); 
        if (!isMountedRef.current) return;
        // ... (switch case 逻辑与上一条回复中的版本一致)
        // 我将直接复制粘贴上一条回复中的 switch case 逻辑
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
            case 'game_started':
                console.log("GamePage: Game started! My cards:", msg.your_cards, "All participants:", msg.players, "AI Players:", msg.aiPlayers);
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
                 console.log(`GamePage: Participant ${msg.userId} is ready.`);
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
                        navigate("/lobby"); // 如果 LobbyPage 存在的话
                    }
                }
                break;
            default:
                console.log("GamePage: Unknown message type received:", msg.type, msg);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, processAndLogMessage, navigate]); // 保持这个依赖列表

    useEffect(() => {
        isMountedRef.current = true;
        let localSocketInstance = null; // 重新引入 localSocketInstance 用于清晰的清理

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

        if (user && user.id) { 
            let currentSocket = getSocket();
            // **修改这里的条件，确保 isSocketConnected 状态被正确使用**
            if (!isSocketConnected || !currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
                console.log(`GamePage: User ${user.id} - Socket not open or not connected. Attempting to connect.`);
                setGameState(prev => ({...prev, status: 'connecting_ws'}));
                localSocketInstance = connectSocket( // 赋值给 localSocketInstance
                    user.id, 
                    null, 
                    () => { 
                        if (!isMountedRef.current) return;
                        console.log(`GamePage: Socket opened. Adding listener & waiting for connection_ack.`);
                        setIsSocketConnected(true); // <--- 设置 isSocketConnected
                        const freshSocket = getSocket();
                        if (freshSocket && socketMessageListenerRef.current) {
                            freshSocket.removeEventListener('message', socketMessageListenerRef.current); 
                            freshSocket.addEventListener('message', socketMessageListenerRef.current);
                        }
                        // 后端应该在 onOpen 后发送 connection_ack，前端收到后再发 user_auth_and_ready
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
                // setIsSocketConnected(true); // Socket 已连接，此状态应已为 true
                if (socketMessageListenerRef.current && currentSocket) { // 确保 currentSocket 存在
                    currentSocket.removeEventListener('message', socketMessageListenerRef.current); 
                    currentSocket.addEventListener('message', socketMessageListenerRef.current);
                }
                // 如果已连接但游戏未开始，发送认证准备消息
                if (gameState.status === 'connecting_ws' || gameState.status === 'disconnected' || gameState.status === 'authenticating_ws') {
                     if (user && user.id) {
                        sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
                        setGameState(prev => ({ ...prev, status: 'authenticating_ws' }));
                    }
                }
            }
        }
        
        return () => {
            isMountedRef.current = false;
            const socketToCleanup = localSocketInstance || getSocket();  // 使用 localSocketInstance 或 getSocket()
            if (socketToCleanup && socketMessageListenerRef.current) {
                console.log(`GamePage: Cleaning up message listener.`);
                socketToCleanup.removeEventListener('message', socketMessageListenerRef.current);
            }
            // GamePage 卸载时不再主动关闭 socket，假设 App.js 或 AuthContext 管理全局 socket 生命周期
            // 如果需要 GamePage 单独管理，则需要在这里添加 closeSocket() 调用
        };
    // **修正依赖数组，这是第 194 行附近**
    // 包含所有在 effect 函数体中读取的、并且可能在组件生命周期内改变的 props 或 state
    }, [user, handleSocketMessage, navigate, gameState.status, gameState.currentRoomId, isSocketConnected]); 
    // 添加了 isSocketConnected, gameState.currentRoomId, gameState.status

    // ... (handleDropCard, handleSubmitCards, handleAiArrange 与之前版本一致) ...
    // ... (渲染逻辑 gameContent 和 return JSX 与之前版本一致) ...
    // (为简洁起见，这里省略了这些函数的重复代码，请确保你使用的是我上一条回复中的完整版本)
};
export default GamePage;
