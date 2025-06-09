// frontend/src/pages/GamePage.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
// useParams 不再需要，因为 roomId 不再从 URL 获取
import { useNavigate, Link } from 'react-router-dom'; 
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
const DraggableCard = ({ cardId, currentZone }) => { /* ... (与之前版本一致) ... */ };
// eslint-disable-next-line no-unused-vars
const DropZone = ({ zoneId, title, cardsInZone, onDropCard, maxCards, className }) => { /* ... (与之前版本一致) ... */ };


const GamePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate(); // 保留 navigate 用于可能的错误跳转

    const [gameState, setGameState] = useState({ 
        status: 'connecting_ws', // 新状态：连接WebSocket
        players: [],             // [{id: participantId, isAi: boolean, isHost: boolean (真实玩家通常是host), ready: boolean}, ...]
        myCards: [],
        // isHost 不再那么重要，因为是人机对战，真实玩家总是主导
        currentRoomId: null,     // 可以用来显示一个虚拟的房间ID
        results: null,
        errorMessage: null 
    });
    
    const [handZone, setHandZone] = useState([]);
    const [frontZone, setFrontZone] = useState([]);
    const [middleZone, setMiddleZone] = useState([]);
    const [backZone, setBackZone] = useState([]);
    
    // eslint-disable-next-line no-unused-vars
    const [messages, setMessages] = useState([]); // 保留消息日志
    // eslint-disable-next-line no-unused-vars
    const [isSocketConnected, setIsSocketConnected] = useState(false); // 仍然有用
    
    const isMountedRef = useRef(true);
    const socketMessageListenerRef = useRef(null);

    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const DnDBackend = isTouchDevice() ? TouchBackend : HTML5Backend;

    const processAndLogMessage = useCallback((msg) => { /* ... (与之前版本一致) ... */ }, []);

    const handleSocketMessage = useCallback((msg) => {
        processAndLogMessage(msg); 
        if (!isMountedRef.current) return;

        switch (msg.type) {
            case 'connection_ack': // 后端确认连接，现在前端可以发送 user_auth_and_ready
                console.log("GamePage: Received connection_ack. Sending user_auth_and_ready.");
                if (user && user.id) {
                    sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
                    setGameState(prev => ({ ...prev, status: 'authenticating_ws' })); // 新状态
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
                    // msg.players 应该是所有参与者ID (真实玩家 + AI)
                    // msg.aiPlayers 是 AI ID 数组
                    players: (msg.players || []).map(participantId => ({
                        id: participantId, 
                        isAi: (msg.aiPlayers || []).includes(participantId),
                        isHost: participantId === user?.id, // 真实玩家是这场AI游戏的主导
                        ready: (msg.aiPlayers || []).includes(participantId) // AI 自动准备好
                    })),
                    currentRoomId: msg.roomId || 'ai_game', // 使用后端传来的虚拟房间ID
                    errorMessage: null
                }));
                break;
            // ... (cards_submitted, player_ready, game_over, error 与之前版本类似) ...
            // 注意：player_joined, player_left, new_host 在纯AI对战模式下可能不再需要或意义改变
            case 'cards_submitted': 
                if(isMountedRef.current) alert(msg.message); 
                // 将自己标记为 ready
                if(isMountedRef.current && user) setGameState(prev => ({ ...prev, players: prev.players.map(p => p.id === user.id ? {...p, ready: true} : p) }));
                break;
            case 'player_ready': // 主要用于AI的隐式ready，或未来真实玩家对战
                 console.log(`GamePage: Participant ${msg.userId} is ready.`); // userId 可能是 AI ID
                 if(isMountedRef.current) setGameState(prev => ({ ...prev, players: prev.players.map(p => p.id === msg.userId ? { ...p, ready: true } : p) }));
                break;
            case 'game_over': /* ... (与之前类似) ... */ break;
            case 'error':
                console.error("GamePage: Game Error from server:", msg.message);
                if(isMountedRef.current) setGameState(prev => ({ ...prev, status: 'error', errorMessage: msg.message }));
                break;
            default:
                console.log("GamePage: Unknown message type received:", msg.type, msg);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, processAndLogMessage, navigate]); // 简化依赖

    useEffect(() => {
        isMountedRef.current = true;
        socketMessageListenerRef.current = (event) => { /* ... (与之前版本一致，调用 handleSocketMessage) ... */ };

        if (user && user.id) { 
            let currentSocket = getSocket();
            if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
                console.log(`GamePage: User ${user.id} - Socket not open. Attempting to connect.`);
                setGameState(prev => ({...prev, status: 'connecting_ws'}));
                /* localSocketInstance = */ 
                connectSocket(
                    user.id, null, 
                    () => { // onOpen - 连接成功后，后端应发送 'connection_ack'
                        if (!isMountedRef.current) return;
                        console.log(`GamePage: Socket opened. Waiting for connection_ack from server.`);
                        setIsSocketConnected(true);
                        const freshSocket = getSocket();
                        if (freshSocket && socketMessageListenerRef.current) {
                            freshSocket.removeEventListener('message', socketMessageListenerRef.current); 
                            freshSocket.addEventListener('message', socketMessageListenerRef.current);
                        }
                        // 不在这里发送 join_room 或 user_auth_and_ready，等待服务器 ack
                    },
                    (event) => { /* onClose */ if (isMountedRef.current) {setIsSocketConnected(false); setGameState(prev => ({ ...prev, status: 'disconnected', errorMessage: `与服务器断开连接 (Code: ${event.code})`})); console.log("GamePage: Socket closed.");} },
                    (err) => { /* onError */ if (isMountedRef.current) {setIsSocketConnected(false); setGameState(prev => ({ ...prev, status: 'error', errorMessage: "WebSocket连接错误: " + err.message })); console.error("GamePage: Socket conn error.");} }
                );
            } else { // Socket 已连接
                console.log(`GamePage: User ${user.id} - Socket already open. Ensuring listener and sending auth if needed.`);
                setIsSocketConnected(true); 
                if (socketMessageListenerRef.current) {
                    currentSocket.removeEventListener('message', socketMessageListenerRef.current); 
                    currentSocket.addEventListener('message', socketMessageListenerRef.current);
                }
                // 如果已连接但游戏未开始 (例如刷新页面后)，重新发送认证准备消息
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
            const socketToCleanup = getSocket(); 
            if (socketToCleanup && socketMessageListenerRef.current) {
                socketToCleanup.removeEventListener('message', socketMessageListenerRef.current);
            }
            // 当 GamePage 卸载时（例如用户登出或导航到其他非游戏页面），我们应该关闭socket
            // 但如果 App 其他部分也可能使用 socket，则不应在这里关闭
            // 假设 GamePage 是 WebSocket 的主要使用者，卸载时关闭
            if (socketToCleanup && socketToCleanup.readyState === WebSocket.OPEN) {
                 console.log("GamePage: Unmounting, closing active WebSocket connection.");
                 // socketToCleanup.close(); // 主动关闭
            }
        };
    // 修正依赖数组
    }, [user, handleSocketMessage, navigate, gameState.status]); // 移除 isSocketConnected, 因为它在 effect 内部被设置

    // ... (handleDropCard, handleSubmitCards, handleAiArrange 与之前版本一致) ...
    // **handleStartGame 不再需要，因为游戏在 user_auth_and_ready 后自动开始**

    // 渲染逻辑大幅简化，因为没有复杂的房间等待和房主逻辑了
    if (!user) return <p>请先登录才能开始游戏...</p>;

    let gameContentToRender;
    switch (gameState.status) {
        case 'connecting_ws':
            gameContentToRender = <p>正在连接到游戏服务器...</p>;
            break;
        case 'authenticating_ws':
            gameContentToRender = <p>正在验证用户并准备游戏...</p>;
            break;
        case 'arranging':
            const amIReady = gameState.players.find(p => p.id === user.id && !p.isAi)?.ready;
            const aiPlayersInfo = gameState.players.filter(p => p.isAi).map(p => `${p.id}${p.ready ? '(已出牌)' : '(思考中)'}`).join(', ');
            gameContentToRender = (
                <>
                    <h3>请理牌 (手牌区: {handZone.length}张)</h3>
                    {aiPlayersInfo && <p>AI 玩家: {aiPlayersInfo}</p>}
                    <DropZone zoneId="hand" title="手牌区" cardsInZone={handZone} onDropCard={handleDropCard} maxCards={13} />
                    <div style={{display: 'flex', justifyContent: 'space-around', marginTop: '20px', flexWrap: 'wrap'}}>
                        <DropZone zoneId="front" title="头道" cardsInZone={frontZone} onDropCard={handleDropCard} maxCards={3} />
                        <DropZone zoneId="middle" title="中道" cardsInZone={middleZone} onDropCard={handleDropCard} maxCards={5} />
                        <DropZone zoneId="back" title="尾道" cardsInZone={backZone} onDropCard={handleDropCard} maxCards={5} />
                    </div>
                    <div style={{marginTop: '20px', textAlign: 'center'}}>
                        <button onClick={handleAiArrange} disabled={amIReady || handZone.length === 0 || gameState.myCards.length === 0} style={{marginRight: '10px', padding: '10px 15px'}}>AI自动理牌</button>
                        <button onClick={handleSubmitCards} disabled={amIReady || frontZone.length !== 3 || middleZone.length !== 5 || backZone.length !== 5} style={{padding: '10px 15px'}}>
                            {amIReady ? '已提交牌型' : '提交牌型'}
                        </button>
                    </div>
                </>
            );
            break;
        case 'finished':
            gameContentToRender = ( /* ... (与之前显示结果的 JSX 类似，确保能正确展示 results) ... */ );
            // 可以加一个“再来一局AI对战”的按钮，点击后发送 user_auth_and_ready
            // gameContentToRender += <button onClick={() => sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id })}>再来一局 (AI)</button>;
            break;
        case 'error':
            gameContentToRender = <div><p style={{color: 'red'}}>错误: {gameState.errorMessage}</p><Link to="/">返回首页</Link></div>;
            break;
        case 'disconnected':
             gameContentToRender = <div><p style={{color: 'orange'}}>与服务器断开连接。{gameState.errorMessage ? `原因: ${gameState.errorMessage}` : ''} 尝试重新连接...</p></div>;
             // useEffect 会在 user 存在时自动尝试重连
             break;
        default:
            gameContentToRender = <p>游戏加载中或未知状态: {gameState.status}</p>;
    }
    
    return (
        <DndProvider backend={DnDBackend} options={{ enableMouseEvents: !isTouchDevice(), delayTouchStart: 150 }}>
            <div>
                <h2>十三水AI练习场 (房间: {gameState.currentRoomId || '自动分配'})</h2>
                <p>玩家: {user.phone_number} (积分: {user.points}) - Socket: {isSocketConnected ? '已连接' : '未连接'}</p>
                {gameContentToRender}
                <div style={{marginTop: '30px'}}>
                    <h4>游戏消息日志 (最新50条):</h4>
                    {/* ... (消息日志渲染保持不变) ... */}
                </div>
            </div>
        </DndProvider>
    );
};
export default GamePage;
