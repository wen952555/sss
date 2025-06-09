// frontend/src/pages/GamePage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // <--- 导入 useParams 和 useNavigate
import { useAuth } from '../contexts/AuthContext';
import { connectSocket, sendSocketMessage, getSocket } from '../services/socket'; 
import Card from '../components/Game/Card';
// ... (DndProvider, ItemTypes, DraggableCard, DropZone 保持不变) ...
import { DndProvider, useDrag, useDrop } from 'react-dnd'; // 确保导入
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { 十三水AI简易分牌 } from '../utils/thirteenWaterLogic';


const ItemTypes = { CARD: 'card' }; // 确保定义

const DraggableCard = ({ id, cardId, currentZone }) => { /* ... (保持不变) ... */ };
const DropZone = ({ zoneId, cardsInZone, onDropCard, acceptType, maxCards, title }) => { /* ... (保持不变) ... */ };


const GamePage = () => {
    const { user } = useAuth();
    const { roomId: roomIdFromUrl } = useParams(); // <--- 从 URL 获取 roomId
    const navigate = useNavigate();

    // gameState 应该包含更多信息，比如当前回合玩家，是否是房主等
    const [gameState, setGameState] = useState({ 
        status: 'connecting', // connecting, waiting, arranging, finished, disconnected
        players: [],          // [{id: userId, isHost: boolean, ready: boolean}, ...]
        myCards: [],
        isHost: false,        // 当前用户是否是房主
        currentRoomId: null,  // 当前实际加入的房间ID
        // ... 其他游戏状态，如当前轮到谁，比牌结果等 ...
    });
    // 单独管理手牌和牌墩，gameState.myCards 只是初始手牌副本
    const [handZone, setHandZone] = useState([]);
    const [frontZone, setFrontZone] = useState([]);
    const [middleZone, setMiddleZone] = useState([]);
    const [backZone, setBackZone] = useState([]);
    
    const [messages, setMessages] = useState([]);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    // const [hasJoinedRoom, setHasJoinedRoom] = useState(false); // 可以通过 gameState.currentRoomId 判断

    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const DnDBackend = isTouchDevice() ? TouchBackend : HTML5Backend;

    const handleSocketMessage = useCallback((msg) => {
        setMessages(prev => [{ timestamp: new Date().toLocaleTimeString(), data: msg }, ...prev.slice(0, 49)]);
        console.log('GamePage: Socket Message Received:', msg);
        switch (msg.type) {
            case 'joined_room':
                if (msg.roomId === roomIdFromUrl) { // 确保是当前URL的房间
                    console.log("GamePage: Successfully joined room:", msg.roomId, "My UserID:", msg.userId, "Players:", msg.players, "Is Host:", msg.isHost);
                    setGameState(prev => ({ 
                        ...prev, 
                        status: msg.gameState || 'waiting', // 使用后端传来的gameState或默认为waiting
                        players: msg.players || [],         // players 应该是 [{id, isHost}, ...]
                        isHost: msg.isHost || false,
                        currentRoomId: msg.roomId
                    }));
                } else {
                    console.warn("GamePage: Joined a different room than expected. Expected:", roomIdFromUrl, "Actual:", msg.roomId);
                    // 可能需要处理这种情况，例如导航到正确的房间或提示错误
                }
                break;
            case 'player_joined':
                console.log("GamePage: Player joined:", msg.userId, "Players:", msg.players);
                 setGameState(prev => ({ ...prev, players: msg.players || [] }));
                break;
            case 'player_left':
                console.log("GamePage: Player left:", msg.userId, "Remaining players:", msg.remainingPlayers);
                 setGameState(prev => ({ ...prev, players: msg.remainingPlayers || [] }));
                break;
            case 'new_host': // 处理房主变更
                console.log("GamePage: New host is now player:", msg.hostUserId);
                setGameState(prev => ({
                    ...prev,
                    isHost: (user && user.id === msg.hostUserId),
                    players: prev.players.map(p => ({ ...p, isHost: p.id === msg.hostUserId }))
                }));
                alert(`玩家 ${msg.hostUserId} 现在是房主。`);
                break;
            case 'game_started':
                console.log("GamePage: Game started! My cards:", msg.your_cards, "All players in game:", msg.players);
                // setMyCards(msg.your_cards); // myCards 现在在 gameState 中管理
                setHandZone(msg.your_cards || []);
                setFrontZone([]);
                setMiddleZone([]);
                setBackZone([]);
                setGameState(prev => ({ 
                    ...prev, 
                    status: 'arranging', 
                    myCards: msg.your_cards || [],
                    players: msg.players.map(id => { // 确保后端 players 是 userId 数组
                        const existingPlayer = prev.players.find(p => p.id === id);
                        return existingPlayer ? { ...existingPlayer, ready: false } : {id, isHost: false, ready: false};
                    })
                }));
                break;
            // ... (cards_submitted, player_ready, game_over, game_cancelled, error 与之前类似) ...
            case 'cards_submitted': alert(msg.message); break;
            case 'player_ready':
                 console.log(`GamePage: Player ${msg.userId} is ready.`);
                 setGameState(prev => ({ ...prev, players: prev.players.map(p => p.id === msg.userId ? { ...p, ready: true } : p) }));
                break;
            case 'game_over':
                setGameState(prev =>({ ...prev, status: 'finished', results: msg.results }));
                alert("Game Over! Check results.");
                console.log("GamePage: Game results:", msg.results);
                setHandZone([]); // 清空手牌区，myCards在gameState中
                break;
            case 'game_cancelled':
                alert(msg.message || "游戏已取消");
                setGameState(prev => ({ ...prev, status: 'waiting', game: null, myCards: []}));
                setHandZone([]); setFrontZone([]); setMiddleZone([]); setBackZone([]);
                break;
            case 'error':
                console.error("GamePage: Game Error from server:", msg.message);
                alert(`服务器错误: ${msg.message}`);
                if (msg.message && msg.message.toLowerCase().includes("room") && msg.message.toLowerCase().includes("not exist")) {
                    navigate("/lobby"); // 如果房间不存在，跳回大厅
                }
                break;

            default:
                console.log("GamePage: Unknown message type received:", msg);
        }
    }, [user, roomIdFromUrl, navigate]); // 添加依赖

    useEffect(() => {
        let localSocketInstance = null;
        if (user && user.id && roomIdFromUrl) { // 确保 roomIdFromUrl 存在
            if (!isSocketConnected) { // 只有在未连接时才尝试新连接
                console.log(`GamePage: User ${user.id} detected, attempting to connect socket for room ${roomIdFromUrl}.`);
                localSocketInstance = connectSocket(
                    user.id,
                    handleSocketMessage,
                    () => { 
                        console.log(`GamePage: Socket opened for room ${roomIdFromUrl}. Sending join_room...`);
                        setIsSocketConnected(true); 
                        sendSocketMessage({ type: 'join_room', roomId: roomIdFromUrl, userId: user.id });
                    },
                    (event) => { 
                        console.log("GamePage: Socket closed. Room:", roomIdFromUrl, "Reason:", event.reason, "Code:", event.code);
                        setIsSocketConnected(false);
                        // setHasJoinedRoom(false); // 由 gameState.currentRoomId 判断
                        setGameState(prev => ({ ...prev, status: 'disconnected', currentRoomId: null, isHost: false }));
                    },
                    (err) => { 
                        console.error("GamePage: Socket connection error for room", roomIdFromUrl, ":", err.message);
                        setIsSocketConnected(false);
                        setGameState(prev => ({ ...prev, status: 'error', message: err.message, currentRoomId: null, isHost: false }));
                    }
                );
            } else {
                // 如果 socket 已连接，但当前房间 ID 与 URL 不符，可能需要重新加入或提示
                if (gameState.currentRoomId !== roomIdFromUrl) {
                    console.log(`GamePage: Socket already connected, but roomId mismatch. URL: ${roomIdFromUrl}, Current: ${gameState.currentRoomId}. Re-joining.`);
                    sendSocketMessage({ type: 'join_room', roomId: roomIdFromUrl, userId: user.id });
                }
            }
        } else if (!roomIdFromUrl && user) {
            console.warn("GamePage: No roomId in URL, redirecting to lobby.");
            navigate("/lobby");
        }
        
        return () => {
            const socketToClose = localSocketInstance || getSocket(); 
            if (socketToClose && socketToClose.readyState === WebSocket.OPEN && roomIdFromUrl) { 
                console.log(`GamePage: Unmounting or roomId/user changed for room ${roomIdFromUrl}. Sending leave_room.`);
                sendSocketMessage({ type: 'leave_room', roomId: roomIdFromUrl, userId: user?.id });
                // 通常不在这里立即 close，除非是应用级别的 socket 管理器决定
                // socketToClose.close(); 
            } else if (socketToClose && roomIdFromUrl) { 
                 console.log(`GamePage: Unmounting for room ${roomIdFromUrl}, socket exists but not open (state: ${socketToClose.readyState}).`);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps 
    }, [user, roomIdFromUrl, isSocketConnected]); // 移除 handleSocketMessage, navigate

    const handleStartGame = () => { /* ... (与之前版本类似，但要用 gameState.currentRoomId) ... */ 
        if (!user || !user.id) { alert("请先登录！"); return; }
        if (!isSocketConnected) { alert("WebSocket 尚未连接，请稍候..."); return; }
        if (gameState.currentRoomId !== roomIdFromUrl) { alert("尚未成功加入当前房间，请稍候..."); return; }
        if (!gameState.isHost) { alert("只有房主才能开始游戏。"); return; } // 新增：只有房主能开始

        console.log(`GamePage: Sending start_game message for room ${gameState.currentRoomId}.`);
        sendSocketMessage({ type: 'start_game', roomId: gameState.currentRoomId, userId: user.id });
    };

    // ... (handleSubmitCards, handleAiArrange, handleDropCard 保持与之前版本类似) ...
    const handleDropCard = (cardId, fromZoneId, toZoneId) => { /* ... */ };
    const handleSubmitCards = () => { /* ... */ };
    const handleAiArrange = () => { /* ... */ };


    if (!user) return <p>请先登录才能进入游戏室...</p>;
    if (!roomIdFromUrl) return <p>未指定房间号。请从 <Link to="/lobby">大厅</Link> 进入房间。</p>;
    if (gameState.status === 'connecting' || (gameState.status === 'disconnected' && !messages.find(m=>m.data?.type==='error'))) { // 避免在已知错误时还显示connecting
        return <p>正在连接到房间 {roomIdFromUrl}...</p>;
    }
    if (gameState.status === 'error') {
        return <div><p>连接到房间 {roomIdFromUrl} 失败: {gameState.message}</p><Link to="/lobby">返回大厅</Link></div>;
    }

    // 游戏界面渲染 (根据 gameState.status)
    let gameContent;
    switch (gameState.status) {
        case 'waiting':
            gameContent = (
                <>
                    <p>已加入房间: {gameState.currentRoomId}. 等待其他玩家...</p>
                    <p>房主: {gameState.players.find(p=>p.isHost)?.id || '未知'}</p>
                    <p>当前玩家: {gameState.players.map(p => `${p.id}${p.isHost ? '(房主)' : ''}`).join(', ')} (共 {gameState.players.length} 人)</p>
                    {gameState.isHost && ( // 只有房主能看到开始游戏按钮
                        <button 
                            onClick={handleStartGame} 
                            disabled={!isSocketConnected || gameState.players.length < (process.env.NODE_ENV === 'development' ? 1 : 2)}
                        >
                            开始游戏 (至少需要 {process.env.NODE_ENV === 'development' ? 1 : 2} 人)
                        </button>
                    )}
                    {!gameState.isHost && <p>等待房主开始游戏...</p>}
                </>
            );
            break;
        case 'arranging':
            // ... (与之前类似，显示手牌和牌墩) ...
            gameContent = ( /* ... */ );
            break;
        case 'finished':
            // ... (与之前类似，显示结果) ...
            gameContent = ( /* ... */ );
            break;
        default:
            gameContent = <p>游戏状态: {gameState.status}. 房间ID: {gameState.currentRoomId}</p>;
    }
    
    return (
        <DndProvider backend={DnDBackend} options={{ enableMouseEvents: !isTouchDevice(), delayTouchStart: 100 }}>
            <div>
                <h2>十三水游戏房间: {gameState.currentRoomId || roomIdFromUrl}</h2>
                <p>玩家: {user.phone_number} (积分: {user.points}) - Socket: {isSocketConnected ? '已连接' : '已连接'} - 房主: {gameState.isHost ? '是' : '否'}</p>
                {gameContent}
                {/* ... (消息日志部分保持不变) ... */}
            </div>
        </DndProvider>
    );
};

export default GamePage;
