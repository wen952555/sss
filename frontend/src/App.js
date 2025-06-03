// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import socket from './socket';
// import Lobby from './components/Lobby'; // Lobby 可能不再是默认视图
import Room from './components/Room';
import './App.css';

// 定义一个特殊的房间ID或类型给AI游戏，或者让后端处理
const AI_GAME_REQUEST_EVENT = 'startAIGame'; // 自定义事件名

function App() {
    // currentView 可以考虑去掉，或者默认就是 'room'
    // const [currentView, setCurrentView] = useState('loading'); // loading, room, error
    const [roomId, setRoomId] = useState(null);
    const [roomData, setRoomData] = useState(null);
    const [myPlayerId, setMyPlayerId] = useState(null);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState('');
    const [isLoading, setIsLoading] = useState(true); // 新增加载状态

    const showNotification = (message, duration = 3000) => {
        setNotification(message);
        setTimeout(() => setNotification(''), duration);
    };
    
    const handleArrangementInvalid = useCallback((message) => {
        setError(message);
        setTimeout(() => setError(''), 5000);
    }, []);

    // 初始加载时尝试开始AI游戏
    useEffect(() => {
        // 获取自己的 socket ID
        const updateMyIdAndStartGame = () => {
            if (socket.connected && socket.id) {
                setMyPlayerId(socket.id);
                console.log("App.js: My Socket ID:", socket.id);
                // 发送开始AI游戏的请求，可以带上玩家期望的昵称
                // 为了简单，我们让后端生成一个默认昵称或使用socket.id
                // 假设后端会处理这个事件并创建一个房间，然后将玩家加入
                // 并通过 'joinedRoom' 或类似事件返回房间信息
                console.log("App.js: Emitting", AI_GAME_REQUEST_EVENT);
                socket.emit(AI_GAME_REQUEST_EVENT, { preferredName: "玩家" }); 
            } else {
                console.log("App.js: Socket not connected yet to start AI game.");
            }
        };

        if (socket.connected) {
            updateMyIdAndStartGame();
        } else {
            socket.once('connect', updateMyIdAndStartGame); // 用 once 避免重复触发
        }

        // 清理函数
        return () => {
            socket.off('connect', updateMyIdAndStartGame);
        };
    }, []); // 这个 effect 只在组件挂载时运行一次

    // 处理Socket事件
    useEffect(() => {
        const handleConnect = () => {
            setIsLoading(false); // 连接成功后可以认为基础加载完成
            setMyPlayerId(socket.id);
            console.log("App.js: Socket connected with ID:", socket.id);
            // 如果之前有房间ID但断线了，可以尝试恢复，但对于自动AI房可能不需要复杂恢复
            if (roomId && !roomData) { // 如果有roomId但没roomData，可能断线了
                console.log("Reconnected, attempting to fetch room state for", roomId);
                socket.emit('requestRoomState', roomId);
            }
        };

        // 'aiGameStarted' 或 'joinedRoom' 将是后端响应 AI_GAME_REQUEST_EVENT 的事件
        // 我们统一使用 'joinedRoom' 来接收房间信息，后端需要适配
        const handleJoinedRoom = (data) => {
            console.log("App.js: Joined AI room:", data);
            setRoomId(data.roomId);
            setRoomData(data); // data 应包含 players, gameState
            // setCurrentView('room'); // 如果不再使用 currentView，这行可以去掉
            setIsLoading(false); // 房间数据来了，加载完成
            setError('');
            showNotification(`已加入AI牌局 ${data.roomId}!`);
        };
        
        socket.on('connect', handleConnect);
        socket.on('joinedRoom', handleJoinedRoom); // 后端创建AI房后，应该也发这个事件

        // 其他socket事件监听器 (playerJoined, playerLeft, dealCards, etc.) 保持不变
        // 但需要注意，这些事件现在可能是针对AI玩家的
        socket.on('playerJoined', (data) => {
            setRoomData(prevData => ({ ...prevData, players: data.players }));
            if (data.newPlayerName && data.playerId !== myPlayerId) { // 确保不是自己加入的通知
                showNotification(`${data.newPlayerName} (AI) 加入了房间。`);
            }
        });

        socket.on('playerLeft', (data) => {
            setRoomData(prevData => ({ ...prevData, players: data.players }));
             if (data.disconnectedPlayerName) {
                showNotification(`${data.disconnectedPlayerName} 离开了房间。`);
            }
        });
        
        socket.on('playerStatusUpdate', (players) => {
            setRoomData(prevData => ({ ...prevData, players }));
        });

        socket.on('dealCards', (data) => {
            setRoomData(prevData => {
                if (!prevData) return null;
                const updatedPlayers = prevData.players.map(p =>
                    p.id === myPlayerId ? { ...p, hand: data.hand, hasSubmitted: false } : p
                );
                return { ...prevData, players: updatedPlayers, gameState: prevData.gameState }; // gameState应由gameStarted或updateGameState更新
            });
            setError('');
            showNotification("已发牌，请理牌！");
        });
        
        socket.on('gameStarted', (data) => { // 后端应该在AI都准备好后发送这个
             setRoomData(prevData => {
                if (!prevData) return null;
                // 当游戏开始时，确保所有玩家（包括AI）的isReady和hasSubmitted状态正确
                const updatedPlayers = data.players.map(p => ({
                    ...p, 
                    isReady: true, // 游戏开始意味着所有人都已准备
                    hasSubmitted: p.isAI ? p.hasSubmitted : false // AI可能已提交，真人玩家未提交
                }));
                return { ...prevData, gameState: data.gameState, players: updatedPlayers };
             });
             showNotification("AI牌局开始!");
        });

        socket.on('updateGameState', (data) => {
            setRoomData(prevData => {
                if (!prevData) return data;
                return { ...prevData, ...data };
            });
            if(data.gameState === 'comparing'){
                showNotification("所有玩家已提交，开始比牌！");
            }
        });
        
        socket.on('playerSubmitted', ({ playerId, players }) => {
            setRoomData(prevData => {
                if (!prevData) return null;
                return { ...prevData, players };
            });
            const submittedPlayer = players.find(p => p.id === playerId);
            if (submittedPlayer) {
                const displayName = submittedPlayer.id === myPlayerId ? submittedPlayer.name : `${submittedPlayer.name} (AI)`;
                showNotification(`${displayName} 已提交牌型。`);
            }
        });

        socket.on('showResults', (data) => {
            setRoomData(prevData => {
                if (!prevData) return null;
                return {
                    ...prevData,
                    players: data.players,
                    comparisonDetails: data.comparisonDetails,
                    gameLog: prevData.gameLog ? [...prevData.gameLog, data.logEntry] : [data.logEntry],
                    gameState: 'comparing' 
                };
            });
        });
        
        socket.on('arrangementInvalid', handleArrangementInvalid);

        socket.on('errorMsg', (message) => {
            setError(message);
            setIsLoading(false); // 出错也算加载结束
            setTimeout(() => setError(''), 7000); // 延长错误显示时间
        });
        
        socket.on('infoMsg', (message) => {
            showNotification(message);
        });

        // allPlayersReadyToStartPrompt 和 nextRoundReadyPrompt 可能需要根据AI逻辑调整或移除
        socket.on('nextRoundReadyPrompt', () => {
            setRoomData(prev => {
                 if (!prev) return { prompt: "准备开始下一局AI牌局。", gameState: 'waiting', comparisonDetails: null };
                return {...prev, prompt: "准备开始下一局AI牌局。", gameState: 'waiting', comparisonDetails: null };
            });
             // 自动为当前玩家发送准备就绪的请求，或者由UI触发
             // setTimeout(() => socket.emit('playerIsReady', { roomId }), 1000); // 示例：1秒后自动准备
        });

        socket.on('gameInterrupted', (data) => {
            setRoomData(prev => {
                if (!prev) return data;
                return {...prev, ...data};
            });
            showNotification(data.message, 5000);
            setIsLoading(false);
        });

        socket.on('roomStateUpdate', (data) => {
            if(data.roomId) {
                setRoomId(data.roomId);
                setRoomData(data);
                setIsLoading(false);
                if (socket.id) setMyPlayerId(socket.id);
            } else {
                //setCurrentView('error'); // 或显示错误信息
                setError("无法恢复AI房间状态，请刷新页面重试。");
                setIsLoading(false);
            }
        });

        // 清理所有监听器
        return () => {
            socket.off('connect', handleConnect);
            socket.off('joinedRoom', handleJoinedRoom);
            socket.off('playerJoined');
            socket.off('playerLeft');
            socket.off('playerStatusUpdate');
            socket.off('dealCards');
            socket.off('gameStarted');
            socket.off('updateGameState');
            socket.off('playerSubmitted');
            socket.off('showResults');
            socket.off('arrangementInvalid', handleArrangementInvalid);
            socket.off('errorMsg');
            socket.off('infoMsg');
            socket.off('nextRoundReadyPrompt');
            socket.off('gameInterrupted');
            socket.off('roomStateUpdate');
        };
    }, [roomId, roomData, handleArrangementInvalid, myPlayerId]); // 依赖项调整

    if (isLoading) {
        return (
            <div className="App">
                <header className="App-header"><h1>多人十三水</h1></header>
                <main><p className="loading-text">正在进入AI牌局，请稍候...</p></main>
                <footer><p>连接中...</p></footer>
            </div>
        );
    }

    if (error && !roomId) { // 如果有错误且没有成功进入房间
        return (
            <div className="App">
                <header className="App-header"><h1>多人十三水</h1></header>
                <main>
                    <div className="error-bar">{error}</div>
                    <button onClick={() => window.location.reload()} style={{padding: '10px 20px', fontSize: '1em', marginTop: '20px'}}>刷新页面</button>
                </main>
                <footer><p>连接失败</p></footer>
            </div>
        );
    }
    
    return (
        <div className="App">
            <header className="App-header">
                <h1>多人十三水 - AI对战</h1>
                {myPlayerId && <p className="socket-id-display">My ID: {myPlayerId}</p>}
            </header>
            <main>
                {notification && <div className="notification-bar">{notification}</div>}
                {error && roomId && <div className="error-bar">{error}</div>} {/* 房间内错误 */}

                {/* 不再需要 Lobby 组件，直接渲染 Room (如果 roomData 存在) */}
                {roomId && roomData && myPlayerId ? (
                    <Room 
                        roomId={roomId} 
                        roomData={roomData} 
                        myPlayerId={myPlayerId}
                        onArrangementInvalid={handleArrangementInvalid}
                    />
                ) : (
                    // 如果还没有 roomData，但不在 isLoading 状态，可能是连接问题或后端未响应
                    !isLoading && <p className="loading-text">无法加载牌局信息，请检查网络或刷新...</p>
                )}
            </main>
            <footer>
                {socket && socket.io && socket.io.opts && (
                     <p>后端: {socket.io.opts.hostname}:{socket.io.opts.port}</p>
                )}
                <p>状态: {socket && socket.connected ? '已连接' : '未连接'}</p>
            </footer>
        </div>
    );
}

export default App;
