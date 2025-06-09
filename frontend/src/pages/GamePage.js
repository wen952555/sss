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
                {(cardsInZone || []).map(cId => (
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
    
    const [messages, setMessages] = useState([]);
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
    }, []);

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
                if (msg.roomId && msg.roomId.toUpperCase() === (roomIdFromUrl || '').toUpperCase()) { 
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
                    // if (msg.message && msg.message.toLowerCase().includes("room") && msg.message.toLowerCase().includes("not exist")) {
                    //     navigate("/lobby"); // LobbyPage 可能已移除，导航到首页或提示
                    // }
                }
                break;
            default:
                console.log("GamePage: Unknown message type received:", msg.type, msg);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, processAndLogMessage, navigate, roomIdFromUrl]);

    useEffect(() => {
        isMountedRef.current = true;
        let localSocketInstance = null; 

        socketMessageListenerRef.current = (event) => { /* ... (与之前版本一致) ... */ };

        if (user && user.id) { // roomIdFromUrl 不再是AI模式的强依赖
            let currentSocket = getSocket();
            if (!isSocketConnected || !currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
                console.log(`GamePage: User ${user.id} - Socket not open or not connected. Attempting to connect.`);
                setGameState(prev => ({...prev, status: 'connecting_ws'}));
                localSocketInstance = connectSocket(
                    user.id, null, 
                    () => { 
                        if (!isMountedRef.current) return;
                        console.log(`GamePage: Socket opened. Adding listener & waiting for connection_ack.`);
                        setIsSocketConnected(true); 
                        const freshSocket = getSocket();
                        if (freshSocket && socketMessageListenerRef.current) {
                            freshSocket.removeEventListener('message', socketMessageListenerRef.current); 
                            freshSocket.addEventListener('message', socketMessageListenerRef.current);
                        }
                    },
                    (event) => { if (isMountedRef.current) {setIsSocketConnected(false); setGameState(prev => ({ ...prev, status: 'disconnected', errorMessage: `与服务器断开连接 (Code: ${event.code})`})); console.log("GamePage: Socket closed.");} },
                    (err) => { if (isMountedRef.current) {setIsSocketConnected(false); setGameState(prev => ({ ...prev, status: 'error', errorMessage: "WebSocket连接错误: " + err.message })); console.error("GamePage: Socket conn error.");} }
                );
            } else { 
                console.log(`GamePage: User ${user.id} - Socket already open. Ensuring listener.`);
                setIsSocketConnected(true); 
                if (socketMessageListenerRef.current && currentSocket) { 
                    currentSocket.removeEventListener('message', socketMessageListenerRef.current); 
                    currentSocket.addEventListener('message', socketMessageListenerRef.current);
                }
                // 如果是AI模式，并且状态允许，发送 user_auth_and_ready
                if (!roomIdFromUrl && (gameState.status === 'connecting_ws' || gameState.status === 'disconnected' || gameState.status === 'authenticating_ws')) {
                     if (user && user.id) {
                        sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
                        setGameState(prev => ({ ...prev, status: 'authenticating_ws' }));
                    }
                }
            }
        }
        return () => {
            isMountedRef.current = false;
            const socketToCleanup = localSocketInstance || getSocket();  
            if (socketToCleanup && socketMessageListenerRef.current) {
                console.log(`GamePage: Cleaning up message listener for GamePage.`);
                socketToCleanup.removeEventListener('message', socketMessageListenerRef.current);
            }
            // 如果是AI模式，GamePage卸载时可以考虑发送一个消息通知服务器（如果需要）
            // 或者由服务器的 onClose 自动处理
        };
    // 调整依赖数组
    }, [user, roomIdFromUrl, navigate, handleSocketMessage, isSocketConnected, gameState.status]);


    const handleDropCard = (cardId, fromZoneId, toZoneId) => { 
        if (fromZoneId === toZoneId) return;
        const zones = { hand: handZone, front: frontZone, middle: middleZone, back: backZone };
        const setZones = { hand: setHandZone, front: setFrontZone, middle: setMiddleZone, back: setBackZone };
        const zoneLimits = { hand: 13, front: 3, middle: 5, back: 5 };
        if (setZones[fromZoneId] && setZones[toZoneId]) {
            setZones[fromZoneId](prev => prev.filter(id => id !== cardId));
            if (zones[toZoneId].length < zoneLimits[toZoneId]) {
                setZones[toZoneId](prev => [...prev, cardId].sort((a,b) => a.localeCompare(b)));
            } else {
                console.warn(`Cannot move ${cardId} to ${toZoneId} (full). Returning to ${fromZoneId}.`);
                setZones[fromZoneId](prev => [...prev, cardId].sort((a,b) => a.localeCompare(b)));
            }
        } else { console.error("handleDropCard: Invalid fromZoneId or toZoneId", fromZoneId, toZoneId); }
    };
    
    // handleStartGame 按钮在AI模式下可能不再需要，或者变为“再来一局”
    const handleStartNewAIGame = () => { 
        if (!user || !user.id) { alert("请先登录！"); return; }
        if (!isSocketConnected) { alert("WebSocket 尚未连接，请稍候..."); return; }
        console.log(`GamePage: Sending user_auth_and_ready for new AI game.`);
        sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
        setGameState(prev => ({ ...prev, status: 'authenticating_ws', results: null, myCards:[] })); // 重置状态
        setHandZone([]);setFrontZone([]);setMiddleZone([]);setBackZone([]);
    };
    
    const handleSubmitCards = () => { 
        if (frontZone.length !== 3 || middleZone.length !== 5 || backZone.length !== 5) {
            alert("牌墩数量不正确！头道3张，中道5张，尾道5张。"); return;
        }
        console.log("GamePage: Sending submit_cards message.");
        sendSocketMessage({
            type: 'submit_cards', 
            // roomId 在AI模式下可能由服务器管理，或者用一个虚拟ID
            roomId: gameState.currentRoomId || 'ai_game', 
            userId: user.id,
            cards: { front: [...frontZone], middle: [...middleZone], back: [...backZone] }
        });
    };
    
    const handleAiArrange = () => { 
        if (gameState.myCards.length === 13) { 
            try {
                const arrangement = aiArrangeCards(gameState.myCards); 
                if(arrangement && arrangement.front && arrangement.middle && arrangement.back) {
                    setFrontZone(arrangement.front); setMiddleZone(arrangement.middle);
                    setBackZone(arrangement.back); setHandZone([]); 
                } else { alert("AI分牌失败，返回结果无效。"); }
            } catch (error) { console.error("AI分牌时发生错误:", error); alert("AI分牌时发生错误，请查看控制台。");}
        } else { alert("没有手牌进行AI分牌。请等待游戏开始。"); }
    };

    if (!user) return <p>请先登录才能进入游戏室...</p>;
    // AI模式下，roomIdFromUrl 可能不存在，我们依赖 gameState.currentRoomId
    // if (!gameState.currentRoomId && gameState.status !== 'connecting_ws' && gameState.status !== 'authenticating_ws' && gameState.status !== 'error') {
    //     return <p>正在准备您的 AI 牌局...</p>;
    // }

    let gameContent;
    if (gameState.status === 'error') {
        gameContent = <div><p style={{color: 'red'}}>错误: {gameState.errorMessage}</p><Link to="/">返回首页</Link></div>;
    } else if (gameState.status === 'connecting_ws' || gameState.status === 'authenticating_ws' || 
              (gameState.status === 'disconnected' && !gameState.errorMessage )) {
        gameContent = <p>正在连接到游戏服务器并准备牌局...</p>;
    } else if (gameState.status === 'arranging') {
        const amIReady = gameState.players.find(p => p.id === user.id && !p.isAi)?.ready;
        const aiPlayersInfo = gameState.players.filter(p => p.isAi).map(p => `${p.id}${p.ready ? '(已出牌)' : '(思考中)'}`).join(', ');
        gameContent = (
            <>
                <h3>请理牌 (手牌区: {handZone.length}张)</h3>
                {aiPlayersInfo && <p>AI 玩家: {aiPlayersInfo}</p>}
                <DropZone zoneId="hand" title="手牌区" cardsInZone={handZone} onDropCard={handleDropCard} maxCards={13} className="hand-zone" />
                <div style={{display: 'flex', justifyContent: 'space-around', marginTop: '20px', flexWrap: 'wrap'}}>
                    <DropZone zoneId="front" title="头道" cardsInZone={frontZone} onDropCard={handleDropCard} maxCards={3} className="front-zone"/>
                    <DropZone zoneId="middle" title="中道" cardsInZone={middleZone} onDropCard={handleDropCard} maxCards={5} className="middle-zone"/>
                    <DropZone zoneId="back" title="尾道" cardsInZone={backZone} onDropCard={handleDropCard} maxCards={5} className="back-zone"/>
                </div>
                <div style={{marginTop: '20px', textAlign: 'center'}}>
                    <button onClick={handleAiArrange} disabled={amIReady || handZone.length === 0 || gameState.myCards.length === 0} style={{marginRight: '10px', padding: '10px 15px'}}>AI自动理牌</button>
                    <button onClick={handleSubmitCards} disabled={amIReady || frontZone.length !== 3 || middleZone.length !== 5 || backZone.length !== 5} style={{padding: '10px 15px'}}>
                        {amIReady ? '已提交牌型' : '提交牌型'}
                    </button>
                </div>
            </>
        );
    } else if (gameState.status === 'finished' && gameState.results) {
        gameContent = (
            <div style={{marginTop: '20px', padding: '15px', border: '1px solid green', borderRadius: '5px'}}>
                <h3>游戏结束 - 结果:</h3>
                {(gameState.results || []).map((res, index) => (
                    <div key={res.userId || index} style={{borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px'}}>
                        <p><strong>{res.isAi ? 'AI ' : '玩家 '}{res.userId}:</strong> 总得分 <span style={{color: res.points_change > 0 ? 'green' : (res.points_change < 0 ? 'red' : 'black')}}>{res.points_change > 0 ? '+' : ''}{res.points_change}</span></p>
                        <div>头道: {res.arranged_cards?.front?.join(', ')} (类型: {res.scores?.front_type}, 得分: {res.scores?.front_score})</div>
                        <div>中道: {res.arranged_cards?.middle?.join(', ')} (类型: {res.scores?.middle_type}, 得分: {res.scores?.middle_score})</div>
                        <div>尾道: {res.arranged_cards?.back?.join(', ')} (类型: {res.scores?.back_type}, 得分: {res.scores?.back_score})</div>
                        {res.special_type && <p>特殊牌型: {res.special_type} (加分: {res.scores?.special_score})</p>}
                    </div>
                ))}
                <button onClick={handleStartNewAIGame} disabled={!isSocketConnected} style={{marginTop: '15px', padding: '10px 20px'}}>
                    再来一局 (AI 对战)
                </button>
            </div>
        );
    } else { // waiting 或其他未知状态
        gameContent = <p>游戏状态: {gameState.status}. 房间ID: {gameState.currentRoomId || 'AI对战'}. 等待服务器响应...</p>;
    }
    
    return (
        <DndProvider backend={DnDBackend}>
            <div>
                <h2>十三水游戏 ({gameState.currentRoomId || 'AI 对战'})</h2>
                <p>玩家: {user.phone_number} (积分: {user.points}) - Socket: {isSocketConnected ? '已连接' : '未连接'}</p>
                {gameContent}
                <div style={{marginTop: '30px'}}>
                    <h4>游戏消息日志 (最新50条):</h4>
                    <div style={{ height: '150px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', background: '#f9f9f9', fontSize: '0.9em' }}>
                        {(messages || []).map((msg, index) => (
                            <p key={index} style={{ margin: '3px 0', borderBottom: '1px dotted #eee', wordBreak: 'break-all' }}>
                                <small><em>{msg && msg.timestamp ? msg.timestamp : ''}</em></small>: 
                                {msg && typeof msg.data === 'object' ? JSON.stringify(msg.data) : String(msg.data ?? '')}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </DndProvider>
    );
};
export default GamePage;
