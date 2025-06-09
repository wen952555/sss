// frontend/src/pages/GamePage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { connectSocket, sendSocketMessage, getSocket } from '../services/socket'; 
import Card from '../components/Game/Card';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { 十三水AI简易分牌 } from '../utils/thirteenWaterLogic';

const ItemTypes = { CARD: 'card' };

const DraggableCard = ({ cardId, currentZone }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.CARD,
        item: { cardId, fromZone: currentZone },
        collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }), [cardId, currentZone]);

    return (
        <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1, cursor: 'move', display: 'inline-block', margin: '2px' }}>
            <Card cardId={cardId} isDraggable={true} />
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
    }), [cardsInZone, maxCards, onDropCard, zoneId, title]); // Added title to dependencies as it's used in log

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
    const { roomId: roomIdFromUrl } = useParams();
    const navigate = useNavigate();

    const [gameState, setGameState] = useState({ 
        status: 'connecting', 
        players: [], 
        myCards: [],
        isHost: false,        
        currentRoomId: null,
        results: null,
        errorMessage: null // For displaying server errors
    });
    
    const [handZone, setHandZone] = useState([]);
    const [frontZone, setFrontZone] = useState([]);
    const [middleZone, setMiddleZone] = useState([]);
    const [backZone, setBackZone] = useState([]);
    
    const [messages, setMessages] = useState([]);
    const [isSocketConnected, setIsSocketConnected] = useState(false);

    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const DnDBackend = isTouchDevice() ? TouchBackend : HTML5Backend;

    const handleSocketMessage = useCallback((msg) => {
        setMessages(prev => [{ timestamp: new Date().toLocaleTimeString(), data: msg }, ...prev.slice(0, 49)]);
        console.log('GamePage: Socket Message Received:', msg);
        switch (msg.type) {
            case 'joined_room':
                if (msg.roomId === roomIdFromUrl) {
                    setGameState(prev => ({ 
                        ...prev, status: msg.gameState || 'waiting', 
                        players: msg.players || [], isHost: msg.isHost || false,
                        currentRoomId: msg.roomId, errorMessage: null
                    }));
                } else { 
                    console.warn("GamePage: Joined a different room. Expected:", roomIdFromUrl, "Actual:", msg.roomId);
                    navigate("/lobby"); 
                }
                break;
            case 'player_joined':
            case 'player_left':
            case 'new_host':
                setGameState(prev => ({ 
                    ...prev, 
                    players: msg.players || [],
                    isHost: msg.hostUserId ? (user && user.id === msg.hostUserId) : prev.isHost,
                    // If player_left and current user is the one who left, or room becomes invalid, navigate to lobby
                }));
                if (msg.type === 'player_left' && msg.userId === user?.id && msg.remainingPlayers?.length === 0) {
                    // If I was the last one to leave, or only one left and I left
                    // navigate("/lobby"); // Or some other logic
                }
                if (msg.type === 'new_host') alert(`玩家 ${msg.hostUserId} 现在是房主。`);
                break;
            case 'game_started':
                setHandZone(msg.your_cards || []);
                setFrontZone([]); setMiddleZone([]); setBackZone([]);
                setGameState(prev => ({ 
                    ...prev, status: 'arranging', myCards: msg.your_cards || [],
                    players: (msg.players || []).map(id => { // Ensure msg.players is an array
                        const existingPlayer = prev.players.find(p => p.id === id);
                        return existingPlayer ? { ...existingPlayer, ready: false } : {id, isHost: (prev.isHost && id === user.id), ready: false};
                    }),
                    errorMessage: null
                }));
                break;
            case 'cards_submitted':
                alert(msg.message);
                // Update current player's ready state in gameState.players
                setGameState(prev => ({
                    ...prev,
                    players: prev.players.map(p => p.id === user?.id ? {...p, ready: true} : p)
                }));
                break;
            case 'player_ready':
                 console.log(`GamePage: Player ${msg.userId} is ready.`);
                 setGameState(prev => ({
                     ...prev,
                     players: prev.players.map(p => p.id === msg.userId ? { ...p, ready: true } : p)
                 }));
                break;
            case 'game_over':
                setGameState(prev =>({ ...prev, status: 'finished', results: msg.results, myCards: [] }));
                setHandZone([]); 
                alert("游戏结束! 请查看结果。");
                break;
            case 'game_cancelled':
                alert(msg.message || "游戏已取消");
                setGameState(prev => ({ ...prev, status: 'waiting', game: null, myCards: [], results: null}));
                setHandZone([]); setFrontZone([]); setMiddleZone([]); setBackZone([]);
                break;
            case 'error':
                console.error("GamePage: Game Error from server:", msg.message);
                setGameState(prev => ({ ...prev, status: 'error', errorMessage: msg.message }));
                // alert(`服务器错误: ${msg.message}`); // Replaced by displaying in UI
                if (msg.message && msg.message.toLowerCase().includes("room") && msg.message.toLowerCase().includes("not exist")) {
                    navigate("/lobby"); 
                }
                break;
            default:
                console.log("GamePage: Unknown message type received:", msg);
        }
    }, [user, roomIdFromUrl, navigate]); 

    useEffect(() => {
        let localSocketInstance = null;
        if (user && user.id && roomIdFromUrl) { 
            if (!isSocketConnected || (getSocket() && getSocket().readyState !== WebSocket.OPEN)) {
                console.log(`GamePage: User ${user.id} detected, attempting to connect socket for room ${roomIdFromUrl}.`);
                localSocketInstance = connectSocket(
                    user.id, handleSocketMessage,
                    () => { 
                        console.log(`GamePage: Socket opened for room ${roomIdFromUrl}. Sending join_room...`);
                        setIsSocketConnected(true); 
                        sendSocketMessage({ type: 'join_room', roomId: roomIdFromUrl, userId: user.id });
                    },
                    (event) => { 
                        console.log("GamePage: Socket closed. Room:", roomIdFromUrl, "Reason:", event.reason, "Code:", event.code);
                        setIsSocketConnected(false);
                        setGameState(prev => ({ ...prev, status: 'disconnected', currentRoomId: null, isHost: false }));
                    },
                    (err) => { 
                        console.error("GamePage: Socket connection error for room", roomIdFromUrl, ":", err.message);
                        setIsSocketConnected(false);
                        setGameState(prev => ({ ...prev, status: 'error', errorMessage: err.message, currentRoomId: null, isHost: false }));
                    }
                );
            } else if (isSocketConnected && gameState.currentRoomId !== roomIdFromUrl) {
                console.log(`GamePage: Socket connected, but roomId mismatch. URL: ${roomIdFromUrl}, Current: ${gameState.currentRoomId}. Re-joining.`);
                sendSocketMessage({ type: 'join_room', roomId: roomIdFromUrl, userId: user.id });
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
                // socketToClose.close(); // Let on_close handler update state. Only close if page is truly leaving.
            }
        };
    }, [user, roomIdFromUrl, isSocketConnected, handleSocketMessage, navigate, gameState.currentRoomId]);

    const handleDropCard = (cardId, fromZoneId, toZoneId) => {
        if (fromZoneId === toZoneId) return;
        const zones = { hand: handZone, front: frontZone, middle: middleZone, back: backZone };
        const setZones = { hand: setHandZone, front: setFrontZone, middle: setMiddleZone, back: setBackZone };
        const zoneLimits = { hand: 13, front: 3, middle: 5, back: 5 };

        if (setZones[fromZoneId] && setZones[toZoneId]) {
            // Remove from source
            setZones[fromZoneId](prev => prev.filter(id => id !== cardId));
            // Add to target if not full
            if (zones[toZoneId].length < zoneLimits[toZoneId]) {
                setZones[toZoneId](prev => [...prev, cardId].sort((a,b) => a.localeCompare(b))); // Sort for consistent order
            } else {
                // Target full, return to source
                console.warn(`Cannot move ${cardId} to ${toZoneId} (full). Returning to ${fromZoneId}.`);
                setZones[fromZoneId](prev => [...prev, cardId].sort((a,b) => a.localeCompare(b)));
            }
        } else {
            console.error("handleDropCard: Invalid fromZoneId or toZoneId", fromZoneId, toZoneId);
        }
    };
    
    const handleStartGame = () => { 
        if (!user || !user.id) { alert("请先登录！"); return; }
        if (!isSocketConnected) { alert("WebSocket 尚未连接，请稍候..."); return; }
        if (gameState.currentRoomId !== roomIdFromUrl) { alert("尚未成功加入当前房间，请稍候..."); return; }
        if (!gameState.isHost) { alert("只有房主才能开始游戏。"); return; } 
        const minPlayers = process.env.NODE_ENV === 'development' ? 1 : 2;
        if (gameState.players.length < minPlayers) {
            alert(`至少需要 ${minPlayers} 名玩家才能开始游戏。`);
            return;
        }
        console.log(`GamePage: Sending start_game message for room ${gameState.currentRoomId}.`);
        sendSocketMessage({ type: 'start_game', roomId: gameState.currentRoomId, userId: user.id });
    };
    
    const handleSubmitCards = () => {
        if (frontZone.length !== 3 || middleZone.length !== 5 || backZone.length !== 5) {
            alert("牌墩数量不正确！头道3张，中道5张，尾道5张。"); return;
        }
        console.log("GamePage: Sending submit_cards message.");
        sendSocketMessage({
            type: 'submit_cards', roomId: gameState.currentRoomId, userId: user.id,
            cards: { front: [...frontZone], middle: [...middleZone], back: [...backZone] } // Send copies
        });
    };

    const handleAiArrange = () => { 
        if (gameState.myCards.length === 13) { // Use gameState.myCards
            try {
                const arrangement = 十三水AI简易分牌(gameState.myCards); 
                if(arrangement && arrangement.front && arrangement.middle && arrangement.back) {
                    setFrontZone(arrangement.front);
                    setMiddleZone(arrangement.middle);
                    setBackZone(arrangement.back);
                    setHandZone([]); 
                } else { alert("AI分牌失败，返回结果无效。"); }
            } catch (error) { console.error("AI分牌时发生错误:", error); alert("AI分牌时发生错误，请查看控制台。");}
        } else { alert("没有手牌进行AI分牌。请等待游戏开始。"); }
    };

    if (!user) return <p>请先登录才能进入游戏室...</p>;
    if (!roomIdFromUrl) return <p>未指定房间号。请从 <Link to="/lobby">大厅</Link> 进入房间。</p>;

    let gameContent;
    if (gameState.status === 'error') {
        gameContent = <div><p style={{color: 'red'}}>错误: {gameState.errorMessage}</p><Link to="/lobby">返回大厅</Link></div>;
    } else if (gameState.status === 'connecting' || (gameState.status === 'disconnected' && !gameState.errorMessage )) {
        gameContent = <p>正在连接到房间 {roomIdFromUrl}...</p>;
    } else if (gameState.status === 'waiting') {
        gameContent = (
            <>
                <p>已加入房间: {gameState.currentRoomId}. 等待其他玩家...</p>
                <p>房主: {gameState.players.find(p=>p.isHost)?.id || '未知'}</p>
                <p>当前玩家 ({gameState.players.length}/{4}): {gameState.players.map(p => `${p.id}${p.isHost ? '(房主)' : ''}`).join(', ')}</p>
                {gameState.isHost && (
                    <button onClick={handleStartGame} disabled={!isSocketConnected || gameState.players.length < (process.env.NODE_ENV === 'development' ? 1 : 2)}>
                        开始游戏 (还需 {Math.max(0, (process.env.NODE_ENV === 'development' ? 1 : 2) - gameState.players.length)} 人)
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
        gameContent = (
            <div style={{marginTop: '20px', padding: '15px', border: '1px solid green', borderRadius: '5px'}}>
                <h3>游戏结束 - 结果:</h3>
                {(gameState.results || []).map((res, index) => ( // Defensive check for results
                    <div key={res.userId || index} style={{borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px'}}>
                        <p><strong>玩家 {res.userId}:</strong> 总得分 <span style={{color: res.points_change > 0 ? 'green' : (res.points_change < 0 ? 'red' : 'black')}}>{res.points_change > 0 ? '+' : ''}{res.points_change}</span></p>
                        <div>头道: {res.arranged_cards?.front?.join(', ')} (类型: {res.scores?.front_type}, 得分: {res.scores?.front_score})</div>
                        <div>中道: {res.arranged_cards?.middle?.join(', ')} (类型: {res.scores?.middle_type}, 得分: {res.scores?.middle_score})</div>
                        <div>尾道: {res.arranged_cards?.back?.join(', ')} (类型: {res.scores?.back_type}, 得分: {res.scores?.back_score})</div>
                        {res.special_type && <p>特殊牌型: {res.special_type} (加分: {res.scores?.special_score})</p>}
                    </div>
                ))}
                <button onClick={handleStartGame} disabled={!isSocketConnected || !gameState.isHost} style={{marginTop: '15px'}}>开始新一局</button>
            </div>
        );
    } else {
        gameContent = <p>游戏状态: {gameState.status}. 房间ID: {gameState.currentRoomId || roomIdFromUrl}</p>;
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
