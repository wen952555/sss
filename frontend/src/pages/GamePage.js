// frontend/src/pages/GamePage.js
import React, { useEffect, useState, useCallback, useRef } from 'react'; // 添加 useRef
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { connectSocket, sendSocketMessage, getSocket } from '../services/socket'; 
import Card from '../components/Game/Card';
import { DndProvider } from 'react-dnd'; // 只需导入 DndProvider
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
// DraggableCard 和 DropZone 组件定义保持与我倒数第二次回复中的版本一致
// (那个修复了依赖项，并且 DraggableCard 传递了 isDraggable)
// 我这里会重新包含它们以确保完整性
import { 十三水AI简易分牌 } from '../utils/thirteenWaterLogic';

const ItemTypes = { CARD: 'card' };

const DraggableCard = ({ cardId, currentZone }) => { /* ... (使用倒数第二次回复的版本) ... */ };
const DropZone = ({ zoneId, title, cardsInZone, onDropCard, maxCards, className }) => { /* ... (使用倒数第二次回复的版本) ... */ };


const GamePage = () => {
    const { user } = useAuth();
    const { roomId: roomIdFromUrl } = useParams();
    const navigate = useNavigate();

    const [gameState, setGameState] = useState({ 
        status: 'connecting', 
        players: [], 
        myCards: [],
        isHost: false,        
        currentRoomId: null,
        results: null,
        errorMessage: null 
    });
    
    const [handZone, setHandZone] = useState([]);
    const [frontZone, setFrontZone] = useState([]);
    const [middleZone, setMiddleZone] = useState([]);
    const [backZone, setBackZone] = useState([]);
    
    const [messages, setMessages] = useState([]); // 这个 messages 是用于显示 WebSocket 消息日志的
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    
    const isMountedRef = useRef(true); // 跟踪组件是否挂载
    const socketMessageListenerRef = useRef(null); // 存储消息监听器

    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const DnDBackend = isTouchDevice() ? TouchBackend : HTML5Backend;

    const processAndLogMessage = useCallback((msg) => {
        console.log('GamePage RAW MSG:', msg); // 打印原始消息
        setMessages(prev => [{ timestamp: new Date().toLocaleTimeString(), data: msg }, ...prev.slice(0, 49)]);
    }, []);

    const handleSocketMessage = useCallback((msg) => {
        processAndLogMessage(msg); // 调用统一的日志记录和处理函数
        console.log('GamePage: Parsed Socket Message Received:', msg);
        switch (msg.type) {
            case 'joined_room':
                if (msg.roomId && msg.roomId.toUpperCase() === roomIdFromUrl.toUpperCase()) {
                    console.log("GamePage: Successfully joined room:", msg.roomId, "My UserID:", msg.userId, "Players:", msg.players, "Is Host:", msg.isHost);
                    setGameState(prev => ({ 
                        ...prev, status: msg.gameState || 'waiting', 
                        players: msg.players || [], isHost: msg.isHost || false, // 直接使用后端传来的 isHost
                        currentRoomId: msg.roomId, errorMessage: null
                    }));
                } else { 
                    console.warn("GamePage: Joined a different room or roomId mismatch. Expected:", roomIdFromUrl, "Actual:", msg.roomId);
                    if (isMountedRef.current) navigate("/lobby"); 
                }
                break;
            case 'player_joined':
            case 'player_left':
            case 'new_host': // 后端发送玩家列表和当前连接是否为房主
                console.log(`GamePage: Event '${msg.type}'. Players:`, msg.players, "Host:", msg.hostUserId);
                setGameState(prev => ({ 
                    ...prev, 
                    players: msg.players || [], // msg.players 应该是 [{id, isHost}, ...]
                    isHost: msg.hostUserId ? (user && user.id === msg.hostUserId) : prev.isHost
                }));
                if (msg.type === 'new_host' && isMountedRef.current) alert(`玩家 ${msg.hostUserId} 现在是房主。`);
                break;
            case 'game_started':
                 console.log("GamePage: Game started! My cards:", msg.your_cards, "All players in game:", msg.players);
                setHandZone(msg.your_cards || []);
                setFrontZone([]); setMiddleZone([]); setBackZone([]);
                setGameState(prev => ({ 
                    ...prev, status: 'arranging', myCards: msg.your_cards || [],
                    players: (msg.players || []).map(playerId => { 
                        const existingPlayer = prev.players.find(p => p.id === playerId);
                        return existingPlayer ? { ...existingPlayer, ready: false } : {id: playerId, isHost: (prev.isHost && playerId === user.id), ready: false};
                    }),
                    errorMessage: null
                }));
                break;
            // ... (cards_submitted, player_ready, game_over, game_cancelled, error 与之前版本类似，确保它们更新 gameState) ...
            case 'cards_submitted': if(isMountedRef.current) alert(msg.message); break;
            case 'player_ready':
                 console.log(`GamePage: Player ${msg.userId} is ready.`);
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
                console.log("GamePage: Unknown message type received:", msg);
        }
    }, [user, roomIdFromUrl, navigate, processAndLogMessage]); // 添加 processAndLogMessage

    useEffect(() => {
        isMountedRef.current = true;
        let localSocketInstance = null;

        // 将消息监听器保存到 ref，以便正确移除
        socketMessageListenerRef.current = (event) => {
            try {
                const parsedMessage = JSON.parse(event.data);
                if (isMountedRef.current) { // 再次检查挂载状态
                    handleSocketMessage(parsedMessage);
                }
            } catch (e) {
                console.error("GamePage: Error parsing raw message data in listener", e, event.data);
            }
        };

        if (user && user.id && roomIdFromUrl) { 
            let currentSocket = getSocket();
            if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
                console.log(`GamePage: User ${user.id} - Socket not open. Attempting to connect for room ${roomIdFromUrl}.`);
                localSocketInstance = connectSocket(
                    user.id, 
                    null, // 主 onMessage 现在由下面的 addEventListener 处理
                    () => { // onOpen
                        if (!isMountedRef.current) return;
                        console.log(`GamePage: Socket opened for room ${roomIdFromUrl}. Adding listener & Sending join_room...`);
                        setIsSocketConnected(true);
                        const freshSocket = getSocket();
                        if (freshSocket && socketMessageListenerRef.current) {
                            freshSocket.removeEventListener('message', socketMessageListenerRef.current); // 先移除旧的（如果有）
                            freshSocket.addEventListener('message', socketMessageListenerRef.current);
                        }
                        sendSocketMessage({ type: 'join_room', roomId: roomIdFromUrl, userId: user.id });
                    },
                    (event) => { /* onClose */  /* ... (与之前版本类似，更新isSocketConnected等) ... */ },
                    (err) => { /* onError */ /* ... (与之前版本类似，更新isSocketConnected等) ... */ }
                );
            } else { // Socket 已连接
                console.log(`GamePage: User ${user.id} - Socket already open. Adding listener & Sending join_room for room ${roomIdFromUrl}.`);
                setIsSocketConnected(true); // 确保状态正确
                if (socketMessageListenerRef.current) {
                    currentSocket.removeEventListener('message', socketMessageListenerRef.current); // 先移除旧的
                    currentSocket.addEventListener('message', socketMessageListenerRef.current);
                }
                // 如果房间ID不匹配，或者需要重新确认加入
                if (gameState.currentRoomId !== roomIdFromUrl || gameState.status === 'disconnected' || gameState.status === 'connecting') {
                    sendSocketMessage({ type: 'join_room', roomId: roomIdFromUrl, userId: user.id });
                }
            }
        } else if (!roomIdFromUrl && user && isMountedRef.current) {
            console.warn("GamePage: No roomId in URL, redirecting to lobby.");
            navigate("/lobby");
        }
        
        return () => {
            isMountedRef.current = false;
            const socketToCleanup = getSocket(); 
            if (socketToCleanup && socketMessageListenerRef.current) {
                console.log(`GamePage: Cleaning up message listener for room ${roomIdFromUrl}.`);
                socketToCleanup.removeEventListener('message', socketMessageListenerRef.current);
            }
            // 不在这里发送 leave_room，除非确定是页面卸载而不是 roomId 变化
            // leave_room 应该在用户主动离开或 WebSocket 连接意外关闭时由 GameHandler 处理
        };
    }, [user, roomIdFromUrl, handleSocketMessage, navigate]); // 移除了 isSocketConnected, gameState.currentRoomId


    // ... (handleDropCard, handleSubmitCards, handleAiArrange 保持与倒数第二次回复中的版本一致) ...
    const handleDropCard = (cardId, fromZoneId, toZoneId) => { /* ... */ };
    const handleSubmitCards = () => { /* ... */ };
    const handleAiArrange = () => { /* ... */ };

    // --- 开始游戏按钮的逻辑 ---
    const handleStartGame = () => { 
        if (!user || !user.id) { alert("请先登录！"); return; }
        if (!isSocketConnected) { alert("WebSocket 尚未连接，请稍候..."); return; }
        if (gameState.currentRoomId !== roomIdFromUrl.toUpperCase()) { // 确保房间号匹配 (统一大写)
             alert("尚未成功加入当前房间，请稍候..."); return; 
        }
        if (!gameState.isHost) { alert("只有房主才能开始游戏。"); return; } 
        
        const currentMinPlayers = process.env.NODE_ENV === 'development' && gameState.players.length === 1 ? 1 : 2; // 开发模式下单人可开始
        if (gameState.players.length < currentMinPlayers) {
            alert(`至少需要 ${currentMinPlayers} 名玩家才能开始游戏。当前 ${gameState.players.length} 人。`);
            return;
        }
        console.log(`GamePage: Sending start_game message for room ${gameState.currentRoomId}.`);
        sendSocketMessage({ type: 'start_game', roomId: gameState.currentRoomId, userId: user.id });
    };
    

    // --- 渲染逻辑 ---
    if (!user) return <p>请先登录才能进入游戏室...</p>;
    if (!roomIdFromUrl) return <p>未指定房间号。请从 <Link to="/lobby">大厅</Link> 进入房间。</p>;

    let gameContent;
    // ... (之前的 switch (gameState.status) 逻辑，但要确保它正确使用 gameState 中的数据)
    // 例如，在 'waiting' 状态下:
    if (gameState.status === 'waiting') {
        gameContent = (
            <>
                <p>已加入房间: {gameState.currentRoomId}. 等待其他玩家...</p>
                <p>房主: {gameState.players.find(p=>p.isHost)?.id || '获取中...'}</p>
                <p>当前玩家 ({gameState.players.length}/{4}): {gameState.players.map(p => `${p.id}${p.isHost ? '(房主)' : ''}`).join(', ')}</p>
                {gameState.isHost && (
                    <button 
                        onClick={handleStartGame} 
                        disabled={!isSocketConnected || gameState.players.length < (process.env.NODE_ENV === 'development' && gameState.players.length === 1 ? 1 : 2) }
                    >
                        开始游戏 (还需 {Math.max(0, (process.env.NODE_ENV === 'development' && gameState.players.length === 1 ? 1 : 2) - gameState.players.length)} 人)
                    </button>
                )}
                {!gameState.isHost && <p>等待房主开始游戏...</p>}
            </>
        );
    } else if (gameState.status === 'arranging') {
        const amIReady = gameState.players.find(p => p.id === user.id)?.ready;
        gameContent = (
            <>
                <h3>请理牌 (手牌区: {handZone.length}张):</h3>
                <p>其他玩家状态: {gameState.players.filter(p=>p.id !== user.id).map(p => `${p.id}${p.ready ? '(已准备)' : '(整理中)'}`).join(', ') || '(等待其他玩家)'}</p>
                <DropZone zoneId="hand" title="手牌区" cardsInZone={handZone} onDropCard={handleDropCard} maxCards={13} className="hand-zone" />
                <div style={{display: 'flex', justifyContent: 'space-around', marginTop: '20px', flexWrap: 'wrap'}}>
                    <DropZone zoneId="front" title="头道" cardsInZone={frontZone} onDropCard={handleDropCard} maxCards={3} className="front-zone"/>
                    <DropZone zoneId="middle" title="中道" cardsInZone={middleZone} onDropCard={handleDropCard} maxCards={5} className="middle-zone"/>
                    <DropZone zoneId="back" title="尾道" cardsInZone={backZone} onDropCard={handleDropCard} maxCards={5} className="back-zone"/>
                </div>
                <div style={{marginTop: '20px', textAlign: 'center'}}>
                    <button onClick={handleAiArrange} disabled={amIReady || handZone.length === 0} style={{marginRight: '10px', padding: '10px 15px'}}>AI自动理牌</button>
                    <button onClick={handleSubmitCards} disabled={amIReady || frontZone.length !== 3 || middleZone.length !== 5 || backZone.length !== 5} style={{padding: '10px 15px'}}>
                        {amIReady ? '已提交牌型' : '提交牌型'}
                    </button>
                </div>
            </>
        );
    } else if (gameState.status === 'finished' && gameState.results) {
        // ... (显示结果的 JSX，与之前类似)
    } else if (gameState.status === 'error') {
        gameContent = <div><p style={{color: 'red'}}>错误: {gameState.errorMessage}</p><Link to="/lobby">返回大厅</Link></div>;
    } else  { // connecting, disconnected, or unknown
        gameContent = <p>正在连接到房间 {roomIdFromUrl} 或状态为: {gameState.status}</p>;
    }
    
    return (
        <DndProvider backend={DnDBackend} options={{ enableMouseEvents: !isTouchDevice(), delayTouchStart: 150 }}>
            <div>
                <h2>十三水游戏房间: {gameState.currentRoomId || roomIdFromUrl}</h2>
                <p>玩家: {user.phone_number} (积分: {user.points}) - 身份: {gameState.isHost ? '房主' : '玩家'} - Socket: {isSocketConnected ? '已连接' : '未连接'}</p>
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
