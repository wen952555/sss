// frontend/src/pages/GamePage.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { connectSocket, sendSocketMessage, getSocket } from '../services/socket'; 
import OriginalCardComponent from '../components/Game/Card'; // 重命名导入，避免与下面定义的冲突
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { 十三水AI简易分牌 as aiArrangeCards } from '../utils/thirteenWaterLogic'; // 重命名导入

// eslint-disable-next-line no-unused-vars
const ItemTypes = { CARD: 'card' }; // 告诉 ESLint ItemTypes 虽然在顶层没直接用，但它是被间接使用的

// eslint-disable-next-line no-unused-vars
const DraggableCard = ({ cardId, currentZone }) => { // DraggableCard 在 DropZone 中使用
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.CARD, // ItemTypes 在这里使用
        item: { cardId, fromZone: currentZone },
        collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }), [cardId, currentZone]);

    return (
        <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1, cursor: 'move', display: 'inline-block', margin: '2px' }}>
            {/* 使用重命名的 OriginalCardComponent */}
            <OriginalCardComponent cardId={cardId} isDraggable={true} /> 
        </div>
    );
};

const DropZone = ({ zoneId, title, cardsInZone, onDropCard, maxCards, className }) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.CARD, // ItemTypes 在这里使用
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
                    <DraggableCard key={cId} cardId={cId} currentZone={zoneId} /> // DraggableCard 在这里使用
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
        status: 'connecting', players: [], myCards: [], isHost: false,        
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
        setMessages(prev => [{ timestamp: new Date().toLocaleTimeString(), data: msg }, ...prev.slice(0, 49)]);
    }, []);

    const handleSocketMessage = useCallback((msg) => {
        processAndLogMessage(msg);
        console.log('GamePage: Parsed Socket Message Received:', msg);
        switch (msg.type) {
            // ... (所有 case 与上一版 GamePage.js 相同) ...
            case 'joined_room': /* ... */ break;
            case 'player_joined': /* ... */ break;
            // ... etc ...
        }
    }, [user, roomIdFromUrl, navigate, processAndLogMessage]); 

    useEffect(() => {
        isMountedRef.current = true;
        // let localSocketInstance = null; // ESLint 报 localSocketInstance 未使用，我们尝试移除或正确使用它

        socketMessageListenerRef.current = (event) => { /* ... */ }; // 与上一版相同

        if (user && user.id && roomIdFromUrl) { 
            let currentSocket = getSocket(); // localSocketInstance 的角色由 currentSocket 承担
            if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
                console.log(`GamePage: User ${user.id} - Socket not open. Attempting to connect for room ${roomIdFromUrl}.`);
                /* localSocketInstance = */ // 不再需要给 localSocketInstance 赋值
                connectSocket( // connectSocket 返回的实例如果不需要立即用，可以不接收
                    user.id, handleSocketMessage,
                    () => { /* onOpen */ /* ... */ sendSocketMessage({ type: 'join_room', roomId: roomIdFromUrl, userId: user.id }); },
                    (event) => { /* onClose */ /* ... */ },
                    (err) => { /* onError */ /* ... */ }
                );
            } else { /* ... (与上一版相同) ... */ }
        } else if (!roomIdFromUrl && user && isMountedRef.current) { /* ... */ }
        
        return () => {
            isMountedRef.current = false;
            // const socketToClose = localSocketInstance || getSocket(); // localSocketInstance 已移除
            const socketToClose = getSocket(); 
            if (socketToClose && socketMessageListenerRef.current) { /* ... */ }
        };
    // **修改依赖数组**
    }, [user, roomIdFromUrl, handleSocketMessage, navigate, gameState.currentRoomId, gameState.status, isSocketConnected]);
    // 添加了 isSocketConnected, gameState.currentRoomId, gameState.status
    // 移除 handleSocketMessage 如果它真的是稳定的 (useCallback 且其依赖稳定)
    // 但为了安全，先保留或根据实际情况调整。

    const handleDropCard = (cardId, fromZoneId, toZoneId) => { /* ... (与上一版相同) ... */ };
    const handleStartGame = () => { /* ... (与上一版相同) ... */ };
    const handleSubmitCards = () => { /* ... (与上一版相同) ... */ };
    
    const handleAiArrange = () => { 
        if (gameState.myCards.length === 13) { 
            try {
                const arrangement = aiArrangeCards(gameState.myCards); // 使用重命名的 aiArrangeCards
                if(arrangement && arrangement.front && arrangement.middle && arrangement.back) {
                    setFrontZone(arrangement.front); setMiddleZone(arrangement.middle);
                    setBackZone(arrangement.back); setHandZone([]); 
                } else { alert("AI分牌失败，返回结果无效。"); }
            } catch (error) { console.error("AI分牌时发生错误:", error); alert("AI分牌时发生错误，请查看控制台。");}
        } else { alert("没有手牌进行AI分牌。请等待游戏开始。"); }
    };

    if (!user) return <p>请先登录才能进入游戏室...</p>;
    if (!roomIdFromUrl) return <p>未指定房间号。请从 <Link to="/lobby">大厅</Link> 进入房间。</p>;

    let gameContent;
    // ... (switch (gameState.status) 逻辑与上一版相同) ...
    
    return (
        <DndProvider backend={DnDBackend} options={{ enableMouseEvents: !isTouchDevice(), delayTouchStart: 150 }}>
            <div>
                {/* ... (JSX 与上一版相同) ... */}
            </div>
        </DndProvider>
    );
};
export default GamePage;
