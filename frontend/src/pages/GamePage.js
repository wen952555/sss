import React, { useEffect, useState, useCallback, useRef } from 'react'; // React, useEffect, useState, useCallback, useRef 都会被使用
import { useParams, useNavigate, Link } from 'react-router-dom';  // useParams, useNavigate, Link 都会被使用
import { useAuth } from '../contexts/AuthContext'; // useAuth 被使用
import { connectSocket, sendSocketMessage, getSocket } from '../services/socket'; // 这三个都会被使用
import OriginalCardComponent from '../components/Game/Card'; // OriginalCardComponent 在 DraggableCard 中使用
import { DndProvider, useDrag, useDrop } from 'react-dnd'; // DndProvider, useDrag, useDrop 都会被使用
import { HTML5Backend } from 'react-dnd-html5-backend'; // HTML5Backend 被使用
import { TouchBackend } from 'react-dnd-touch-backend'; // TouchBackend 被使用
import { 十三水AI简易分牌 as aiArrangeCards } from '../utils/thirteenWaterLogic'; // aiArrangeCards 被使用

const ItemTypes = { CARD: 'card' }; // ItemTypes 在 DraggableCard 和 DropZone 中使用

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
    const { user } = useAuth(); // user 被使用
    const { roomId: roomIdFromUrl } = useParams(); // roomIdFromUrl 被使用 (即使是AI模式，也可能用于显示一个虚拟ID)
    const navigate = useNavigate(); // navigate 被使用

    const [gameState, setGameState] = useState({ 
        status: 'idle', players: [], myCards: [], isHost: false,        
        currentRoomId: null, results: null, errorMessage: null 
    }); // gameState 和 setGameState 都会被使用
    
    const [handZone, setHandZone] = useState([]); // handZone 和 setHandZone 都会被使用
    const [frontZone, setFrontZone] = useState([]); // frontZone 和 setFrontZone 都会被使用
    const [middleZone, setMiddleZone] = useState([]); // middleZone 和 setMiddleZone 都会被使用
    const [backZone, setBackZone] = useState([]);   // backZone 和 setBackZone 都会被使用
    
    const [messages, setMessages] = useState([]); // messages 和 setMessages 都会被使用
    const [isSocketConnected, setIsSocketConnected] = useState(false); // isSocketConnected 和 setIsSocketConnected 都会被使用
    
    const isMountedRef = useRef(true); // isMountedRef 被使用
    const socketMessageListenerRef = useRef(null); // socketMessageListenerRef 被使用

    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const DnDBackend = isTouchDevice() ? TouchBackend : HTML5Backend; // DnDBackend 被使用

    const processAndLogMessage = useCallback((msg) => {
        console.log('GamePage RAW MSG:', msg);
        if (isMountedRef.current) {
            setMessages(prev => [{ timestamp: new Date().toLocaleTimeString(), data: msg }, ...prev.slice(0, 49)]);
        }
    }, []); // setMessages 是稳定的

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
                            isHost: (user && participantId === user.id && !(msg.aiPlayers || []).includes(participantId)), 
                            ready: (msg.aiPlayers || []).includes(participantId) 
                        })),
                        currentRoomId: msg.roomId || 'ai_game', 
                        errorMessage: null
                    }));
                }
                break;
            case 'cards_submitted': 
                if(isMountedRef.current) alert(msg.message); 
                if(isMountedRef.current && user) setGameState(prev => ({ ...prev, players: prev.players.map(p => p.id === user.id ? {...p, ready: true} : p) }));
                break;
            case 'player_ready': // 主要用于AI的隐式ready
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
            case 'error': // 处理后端发送的业务逻辑错误
                console.error("GamePage: Game Error from server:", msg.message);
                if(isMountedRef.current) {
                    setGameState(prev => ({ ...prev, status: 'error', errorMessage: msg.message }));
                }
                break;
            default: // 添加 default case
                console.log("GamePage: Unknown message type received:", msg.type, msg);
        }
    // 依赖数组调整：移除 navigate, roomIdFromUrl 如果它们在回调中不是直接依赖来决定是否重新创建回调
    // user?.id 和 processAndLogMessage 比较稳定
    }, [user?.id, processAndLogMessage]);

    useEffect(() => {
        isMountedRef.current = true;
        let localSocketInstance = null; 

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
            let currentGlobalSocket = getSocket();
            if (!isSocketConnected || !currentGlobalSocket || currentGlobalSocket.readyState !== WebSocket.OPEN) {
                console.log(`GamePage: User ${user.id} - Socket not open or not connected. Attempting to connect.`);
                if (isMountedRef.current) setGameState(prev => ({...prev, status: 'connecting_ws'}));
                
                localSocketInstance = connectSocket(
                    user.id, 
                    handleSocketMessage, // 直接将稳定引用的 handleSocketMessage 作为主回调
                    () => { // onOpen
                        if (!isMountedRef.current) return;
                        console.log(`GamePage: Socket opened. Server should send 'connection_ack'.`);
                        setIsSocketConnected(true); 
                        // 不再在这里手动 addEventListener，因为已作为 onMessageCallback 传入
                    },
                    (event) => { 
                        if (isMountedRef.current) {
                            setIsSocketConnected(false); 
                            setGameState(prev => ({ ...prev, status: 'disconnected', errorMessage: `与服务器断开连接 (Code: ${event.code})`})); 
                            console.log("GamePage: Socket closed in useEffect.");
                        } 
                    },
                    (err) => { 
                        if (isMountedRef.current) {
                            setIsSocketConnected(false); 
                            setGameState(prev => ({ ...prev, status: 'error', errorMessage: "WebSocket连接错误: " + err.message })); 
                            console.error("GamePage: Socket conn error in useEffect.");
                        } 
                    }
                );
            } else { 
                console.log(`GamePage: User ${user.id} - Socket already open.`);
                if (isMountedRef.current) setIsSocketConnected(true); 
                
                // 确保监听器被设置 (connectSocket 现在应该在内部处理这个)
                // 如果 connectSocket 替换了旧的 onmessage，这里不需要再操作
                // currentGlobalSocket.removeEventListener('message', socketMessageListenerRef.current);
                // currentGlobalSocket.addEventListener('message', socketMessageListenerRef.current);
                
                if (gameState.status === 'idle' || gameState.status === 'connecting_ws' || gameState.status === 'authenticating_ws') {
                     if (user && user.id) {
                        console.log("GamePage: Socket open & initial state, sending user_auth_and_ready.");
                        sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
                        if (isMountedRef.current) setGameState(prev => ({ ...prev, status: 'authenticating_ws' }));
                    }
                }
            }
        }
        
        return () => {
            isMountedRef.current = false;
            console.log("GamePage: useEffect cleanup function running.");
            // localSocketInstance 如果在此 effect 中创建且仅作用于此，可以考虑关闭
            // 但由于 connectSocket 现在管理全局 socket，通常不由 GamePage 主动关闭，除非应用退出
            // 如果 socketMessageListenerRef.current 是手动添加的，则需要移除：
            // const socketToCleanup = getSocket();
            // if (socketToCleanup && socketMessageListenerRef.current) {
            //    socketToCleanup.removeEventListener('message', socketMessageListenerRef.current);
            // }
        };
    // 依赖数组：当这些值变化时，effect 会重新运行
    }, [user, navigate, handleSocketMessage, isSocketConnected, gameState.status, roomIdFromUrl]);


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
    
    const handleStartNewAIGame = () => { 
        if (!user || !user.id) { alert("请先登录！"); return; }
        if (!isSocketConnected) { alert("WebSocket 尚未连接，请稍候..."); return; }
        console.log(`GamePage: Sending user_auth_and_ready for new AI game.`);
        sendSocketMessage({ type: 'user_auth_and_ready', userId: user.id });
        setGameState(prev => ({ ...prev, status: 'authenticating_ws', results: null, myCards:[] }));
        setHandZone([]);setFrontZone([]);setMiddleZone([]);setBackZone([]);
    };
    
    const handleSubmitCards = () => { 
        if (frontZone.length !== 3 || middleZone.length !== 5 || backZone.length !== 5) {
            alert("牌墩数量不正确！头道3张，中道5张，尾道5张。"); return;
        }
        console.log("GamePage: Sending submit_cards message.");
        sendSocketMessage({
            type: 'submit_cards', 
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
                <h3>请理牌 (手牌区: {handZone.length}张):</h3>
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
