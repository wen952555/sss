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

    const processAndLogMessage = useCallback((msg) => { /* ... (与上一条回复相同) ... */ }, []);
    const handleSocketMessage = useCallback((msg) => { /* ... (与上一条回复相同, 确保 default case 存在) ... */ }, [user?.id, roomIdFromUrl, navigate, processAndLogMessage]);
    useEffect(() => { /* ... (与上一条回复相同, 确保依赖数组正确) ... */ }, [user, roomIdFromUrl, navigate, handleSocketMessage, isSocketConnected, gameState.currentRoomId, gameState.status]);
    const handleDropCard = (cardId, fromZoneId, toZoneId) => { /* ... (与上一条回复相同) ... */ };
    const handleStartGame = () => { /* ... (与上一条回复相同) ... */ };
    const handleSubmitCards = () => { /* ... (与上一条回复相同) ... */ };
    const handleAiArrange = () => { /* ... (与上一条回复相同) ... */ };

    if (!user) return <p>请先登录才能进入游戏室...</p>;
    if (!roomIdFromUrl && gameState.status !== 'connecting_ws' && gameState.status !== 'authenticating_ws') {
        return <p>未指定房间号。请从 <Link to={user ? "/lobby" : "/login"}>入口</Link> 进入房间。</p>;
    }

    let gameContent;
    if (gameState.status === 'error') {
        gameContent = <div><p style={{color: 'red'}}>错误: {gameState.errorMessage}</p><Link to={user ? "/lobby" : "/"}>返回</Link></div>;
    } else if (gameState.status === 'connecting_ws' || (gameState.status === 'disconnected' && !gameState.errorMessage )) {
        gameContent = <p>正在连接到房间 {roomIdFromUrl || '中'}...</p>;
    } else if (gameState.status === 'authenticating_ws') {
        gameContent = <p>正在验证用户并准备游戏...</p>;
    } else if (gameState.status === 'waiting') {
        const hostInfo = gameState.players.find(p => p.isHost);
        const minPlayersToStart = process.env.NODE_ENV === 'development' && gameState.players.length === 1 ? 1 : 2;
        gameContent = (
            <>
                <p>已加入房间: {gameState.currentRoomId}. 等待其他玩家...</p>
                <p>房主: {hostInfo ? hostInfo.id : '获取中...'}</p>
                <p>当前玩家 ({gameState.players.length}/{4}): {gameState.players.map(p => `${p.id}${p.isHost ? '(房主)' : ''}`).join(', ')}</p>
                {gameState.isHost && (
                    <button 
                        onClick={handleStartGame} 
                        disabled={!isSocketConnected || gameState.players.length < minPlayersToStart }
                    >
                        开始游戏 (还需 {Math.max(0, minPlayersToStart - gameState.players.length)} 人)
                    </button>
                )}
                {!gameState.isHost && <p>等待房主开始游戏...</p>}
            </>
        );
    } else if (gameState.status === 'arranging') {
        const amIReady = gameState.players.find(p => p.id === user.id)?.ready;
        gameContent = ( // 这是第 216 行附近开始
            <>
                <h3>请理牌 (手牌区: {handZone.length}张):</h3>
                <p>其他玩家状态: {gameState.players.filter(p=>p.id !== user.id).map(p => `${p.id}${p.ready ? '(已准备)' : '(整理中)'}`).join(', ') || '(等待其他玩家)'}</p>
                {/* 下面是 DropZone 组件，错误可能在这些属性中，特别是 className */}
                <DropZone zoneId="hand" title="手牌区" cardsInZone={handZone} onDropCard={handleDropCard} maxCards={13} className="hand-zone" />
                <div style={{display: 'flex', justifyContent: 'space-around', marginTop: '20px', flexWrap: 'wrap'}}>
                    {/* 第 220 行，第 63 个字符，很可能在下面这个 DropZone 的 className 或其他属性附近 */}
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
        ); // arranging JSX 结束
    } else if (gameState.status === 'finished' && gameState.results) {
        // ... (finished JSX from previous full version) ...
    } else {
        gameContent = <p>游戏状态: {gameState.status}. 房间ID: {gameState.currentRoomId || roomIdFromUrl || '加载中...'}</p>;
    }
    
    return (
        <DndProvider backend={DnDBackend}>
            <div>
                <h2>十三水游戏房间: {gameState.currentRoomId || roomIdFromUrl || 'AI对战'}</h2>
                <p>玩家: {user.phone_number} (积分: {user.points}) - 身份: {gameState.isHost ? '房主' : '玩家'} - Socket: {isSocketConnected ? '已连接' : '未连接'}</p>
                {gameContent}
                <div style={{marginTop: '30px'}}>
                    <h4>游戏消息日志 (最新50条):</h4>
                    <div style={{ height: '150px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', background: '#f9f9f9', fontSize: '0.9em' }}>
                        {(messages || []).map((msg, index) => (
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
