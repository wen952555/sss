// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import socket from './socket';
import Room from './components/Room'; // Room 组件将是主要显示内容
import './App.css';

const AI_GAME_REQUEST_EVENT = 'startAIGame';

function App() {
    const [roomId, setRoomId] = useState(null);
    const [roomData, setRoomData] = useState(null); // 初始为 null，Room 组件内部处理占位
    const [myPlayerId, setMyPlayerId] = useState(null);
    const [error, setError] = useState(''); // 用于显示在通知条或 Room 组件内部
    const [notification, setNotification] = useState('');
    // isLoading 状态可以保留，但其作用更多是控制初次请求，而不是整个页面的切换
    const [isInitiallyLoading, setIsInitiallyLoading] = useState(true); 
    const [isConnected, setIsConnected] = useState(socket.connected); // 跟踪连接状态

    const showNotification = (message, duration = 3000) => {
        setNotification(message);
        setTimeout(() => setNotification(''), duration);
    };
    
    const handleArrangementInvalid = useCallback((message) => {
        setError(message); // 这个错误通常由 GameBoard 内部处理，这里可以作为备用或全局通知
        setTimeout(() => setError(''), 5000);
    }, []);

    // 初始加载时获取 MyPlayerId 并尝试开始AI游戏
    useEffect(() => {
        const attemptStartAIGame = () => {
            if (socket.connected && socket.id) {
                setMyPlayerId(socket.id);
                console.log("App.js: My Socket ID:", socket.id, "Attempting to start AI game.");
                socket.emit(AI_GAME_REQUEST_EVENT, { preferredName: "玩家" });
                // isInitiallyLoading 会在 joinedRoom 或 error 时设置为 false
            } else {
                console.log("App.js: Socket not connected yet. Will attempt on connect.");
                // 等待 connect 事件
            }
        };

        if (socket.connected) {
            attemptStartAIGame();
        } else {
            // 使用 once 确保只在第一次连接时尝试自动开始游戏
            socket.once('connect', attemptStartAIGame); 
        }
        
        // 清理 once 监听器，虽然 once 会自动移除，但好习惯是显式移除
        return () => {
            socket.off('connect', attemptStartAIGame);
        };
    }, []); // 空依赖数组，只在挂载时运行

    // 处理Socket核心事件
    useEffect(() => {
        const handleConnect = () => {
            setIsConnected(true);
            setMyPlayerId(socket.id); // 确保myPlayerId在重连时也更新
            console.log("App.js: Socket connected with ID:", socket.id);
            // 如果之前有房间ID但roomData丢失 (可能由于断线重连且后端清除了部分状态)，
            // 可以尝试请求房间状态，后端AI房的逻辑会处理如何响应
            if (roomId && !roomData) {
                console.log("App.js: Reconnected, fetching room state for", roomId);
                socket.emit('requestRoomState', roomId);
            } else if (!roomId && !isInitiallyLoading) {
                // 如果重连后发现没有roomId，且不是初次加载（意味着之前可能已经失败过）
                // 可以再次尝试开始AI游戏，或者提示用户刷新
                // console.log("App.js: Reconnected without roomId, retrying AI game start.");
                // socket.emit(AI_GAME_REQUEST_EVENT, { preferredName: "玩家" });
            }
            // setIsInitiallyLoading(false); // 连接成功不代表游戏数据已加载
        };

        const handleDisconnect = () => {
            setIsConnected(false);
            setError("与服务器断开连接，请检查网络。正在尝试重连...");
            console.log("App.js: Socket disconnected.");
            // roomData 可以不清空，让Room组件显示断线前的状态，或者显示一个遮罩
        };

        const handleJoinedRoom = (data) => {
            console.log("App.js: Joined/Updated AI room:", data);
            setRoomId(data.roomId);
            setRoomData(data);
            setIsInitiallyLoading(false); // 成功加入房间，初始加载完成
            setError(''); // 清除之前的错误
            // showNotification(`已进入牌局 ${data.roomId}`); // Room组件内部可以有更具体的欢迎
        };

        const handleRoomStateUpdate = (data) => {
            if (data.roomId) {
                setRoomId(data.roomId);
                setRoomData(data);
                setIsInitiallyLoading(false);
                if (socket.id) setMyPlayerId(socket.id);
                 setError(''); // 状态更新成功，清除错误
            } else {
                setError("无法获取房间状态，可能需要刷新。");
                setRoomData(null); // 清空房间数据
                setIsInitiallyLoading(false);
            }
        };
        
        const handleErrorMsg = (message) => {
            setError(message);
            setIsInitiallyLoading(false); // 任何错误都应结束初始加载状态
            // setTimeout(() => setError(''), 7000); // 由 Room 组件内部的错误显示控制
        };

        // 注册核心连接和房间状态事件
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('joinedRoom', handleJoinedRoom); // 后端处理AI_GAME_REQUEST_EVENT后发这个
        socket.on('roomStateUpdate', handleRoomStateUpdate);
        socket.on('errorMsg', handleErrorMsg); // 通用错误

        // 其他游戏逻辑事件 (在Room组件中可能也需要监听或通过props传递处理函数)
        // 为了App.js的简洁，很多游戏内部的逻辑更新可以让Room组件直接监听
        // 这里只保留对App级状态有影响的
        const gameSpecificEvents = [
            'playerJoined', 'playerLeft', 'playerStatusUpdate', 'dealCards', 
            'gameStarted', 'updateGameState', 'playerSubmitted', 'showResults', 
            'arrangementInvalid', 'infoMsg', 'nextRoundReadyPrompt', 'gameInterrupted'
        ];

        const updateRoomDataHandler = (eventData) => {
            // 通用更新 roomData 的逻辑，确保 gameState 和 players 总被更新
            setRoomData(prevData => {
                if (!prevData && eventData.roomId && eventData.roomId !== roomId) {
                    // 如果是新房间的数据，但App的roomId还没更新，这可能是个问题
                    // 但通常 joinedRoom 会先设置好 roomId
                    console.warn("Received event for a different room or no current roomData. Event:", eventData);
                    // return eventData; // 或者忽略
                }
                const baseUpdate = prevData ? { ...prevData } : {};
                if (eventData.players) baseUpdate.players = eventData.players;
                if (eventData.gameState) baseUpdate.gameState = eventData.gameState;
                
                // 根据不同事件合并特定数据
                switch (eventData.type) { // 假设事件数据中有一个 type 字段或通过事件名区分
                    case 'dealCards': // (dealCards 事件本身没有type，需要包装或硬编码)
                        if (eventData.hand && myPlayerId) {
                             baseUpdate.players = baseUpdate.players?.map(p =>
                                p.id === myPlayerId ? { ...p, hand: eventData.hand, hasSubmitted: false } : p
                            ) || [];
                        }
                        break;
                    case 'showResults':
                        if(eventData.comparisonDetails) baseUpdate.comparisonDetails = eventData.comparisonDetails;
                        if(eventData.logEntry) baseUpdate.gameLog = baseUpdate.gameLog ? [...baseUpdate.gameLog, eventData.logEntry] : [eventData.logEntry];
                        break;
                    // ... 其他事件的特定处理
                    default:
                        // 对于没有特定处理的事件，直接合并所有新数据
                        Object.assign(baseUpdate, eventData); 
                        break;
                }
                return baseUpdate;
            });
        };
        
        // 为简化，让Room组件直接监听这些事件，或者需要更复杂的事件分发
        // 这里我们暂时保持App.js监听，但Room组件内部的显示逻辑会更重要
        socket.on('playerJoined', data => updateRoomDataHandler({...data, type: 'playerJoined'}));
        socket.on('playerLeft', data => updateRoomDataHandler({...data, type: 'playerLeft'}));
        socket.on('playerStatusUpdate', players => updateRoomDataHandler({players, type: 'playerStatusUpdate'}));
        socket.on('dealCards', data => {
            updateRoomDataHandler({...data, type: 'dealCards'});
            showNotification("已发牌，请理牌！");
        });
        socket.on('gameStarted', data => {
            updateRoomDataHandler({...data, type: 'gameStarted'});
            showNotification("AI牌局开始!");
        });
        socket.on('updateGameState', data => updateRoomDataHandler({...data, type: 'updateGameState'}));
        socket.on('playerSubmitted', data => updateRoomDataHandler({...data, type: 'playerSubmitted'}));
        socket.on('showResults', data => updateRoomDataHandler({...data, type: 'showResults'}));
        socket.on('arrangementInvalid', handleArrangementInvalid); // 这个回调已定义
        socket.on('infoMsg', message => showNotification(message));
        socket.on('nextRoundReadyPrompt', data => {
            updateRoomDataHandler({...data, type: 'nextRoundReadyPrompt', gameState: 'waiting', comparisonDetails: null});
            showNotification(data.prompt || "准备开始下一局AI牌局。");
        });
        socket.on('gameInterrupted', data => {
            updateRoomDataHandler({...data, type: 'gameInterrupted'});
            showNotification(data.message, 5000);
        });


        // 清理所有监听器
        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('joinedRoom', handleJoinedRoom);
            socket.off('roomStateUpdate', handleRoomStateUpdate);
            socket.off('errorMsg', handleErrorMsg);

            gameSpecificEvents.forEach(event => socket.off(event));
        };
    }, [roomId, roomData, handleArrangementInvalid, myPlayerId, isInitiallyLoading]); // 确保依赖项正确

    // 准备传递给 Room 组件的连接状态信息
    const connectionInfo = {
        isConnected,
        backendHost: socket && socket.io && socket.io.opts ? `${socket.io.opts.hostname}:${socket.io.opts.port}` : "N/A"
    };

    return (
        <div className="App">
            {/* 顶部 Header 已大幅简化或移除，可以只保留一个非常小的状态栏如果需要 */}
            {/* <header className="App-header"> */}
                {/* <h1>多人十三水 - AI对战</h1> */} {/* 标题已移除 */}
                {/* myPlayerId 可以考虑在Room内部或调试时显示 */}
                {/* {myPlayerId && <p className="socket-id-display">My ID: {myPlayerId}</p>} */}
            {/* </header> */}
            
            <main>
                {/* 通知和错误条现在总是在main的顶部显示 */}
                {notification && <div className="notification-bar">{notification}</div>}
                {error && <div className="error-bar">{error}</div>}

                {/* 始终尝试渲染 Room 组件，Room 组件内部处理加载和空数据状态 */}
                <Room 
                    roomId={roomId} 
                    roomData={roomData} 
                    myPlayerId={myPlayerId}
                    onArrangementInvalid={handleArrangementInvalid}
                    isInitiallyLoading={isInitiallyLoading} // 将初始加载状态传递下去
                    connectionInfo={connectionInfo} // 将连接信息传递下去
                />
            </main>
            {/* 原先的 footer 已移除，连接状态将整合到 Room 组件的底部 */}
        </div>
    );
}

export default App;
