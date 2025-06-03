// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import socket from './socket';
import Lobby from './components/Lobby';
import Room from './components/Room';
import './App.css';

function App() {
    const [currentView, setCurrentView] = useState('lobby'); // lobby, room
    const [roomId, setRoomId] = useState(null);
    const [roomData, setRoomData] = useState(null); // { players: [], gameState: '', ... }
    const [myPlayerId, setMyPlayerId] = useState(null);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState('');


    const showNotification = (message, duration = 3000) => {
        setNotification(message);
        setTimeout(() => setNotification(''), duration);
    };
    
    const handleArrangementInvalid = useCallback((message) => {
        setError(message);
        setTimeout(() => setError(''), 5000);
    }, []);


    useEffect(() => {
        // socket.id 可能在连接建立后才有值，或者重连后改变
        const updateMyId = () => {
            if (socket.connected && socket.id) {
                setMyPlayerId(socket.id);
                console.log("App.js: Updated socket ID:", socket.id);
            }
        };
        updateMyId(); // Initial attempt

        socket.on('connect', () => {
            updateMyId();
            if (roomId && currentView === 'room') {
                console.log("Reconnected, attempting to fetch room state for", roomId);
                socket.emit('requestRoomState', roomId);
            }
        });
        
        socket.on('roomCreated', (data) => {
            setRoomId(data.roomId);
            setRoomData(data); // roomData 包含了 players, gameState 等
            setCurrentView('room');
            setError('');
            showNotification(`房间 ${data.roomId} 创建成功!`);
        });

        socket.on('joinedRoom', (data) => {
            setRoomId(data.roomId);
            setRoomData(data);
            setCurrentView('room');
            setError('');
            showNotification(`成功加入房间 ${data.roomId}!`);
        });

        socket.on('playerJoined', (data) => {
            setRoomData(prevData => ({ ...prevData, players: data.players }));
            if (data.newPlayerName) {
                showNotification(`${data.newPlayerName} 加入了房间。`);
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
                if (!prevData) return null; // Guard against null prevData
                const updatedPlayers = prevData.players.map(p =>
                    p.id === myPlayerId ? { ...p, hand: data.hand, hasSubmitted: false } : p
                );
                return { ...prevData, players: updatedPlayers, gameState: data.gameState };
            });
            setError('');
            showNotification("已发牌，请理牌！");
        });
        
        socket.on('gameStarted', (data) => {
             setRoomData(prevData => {
                if (!prevData) return null;
                return { ...prevData, gameState: data.gameState, players: data.players.map(p => ({...p, hasSubmitted: false, isReady: true})) };
             });
             showNotification("游戏开始!");
        });

        socket.on('updateGameState', (data) => {
            setRoomData(prevData => {
                if (!prevData) return data; // If no prevData, use new data
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
                showNotification(`${submittedPlayer.name} 已提交牌型。`);
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
            setTimeout(() => setError(''), 5000);
        });
        
        socket.on('infoMsg', (message) => {
            showNotification(message);
        });

        socket.on('allPlayersReadyToStartPrompt', () => {
            setRoomData(prev => {
                if (!prev) return { prompt: "所有玩家已就座，等待玩家准备" };
                return {...prev, prompt: "所有玩家已就座，等待玩家准备"};
            });
        });
        socket.on('nextRoundReadyPrompt', () => {
            setRoomData(prev => {
                 if (!prev) return { prompt: "准备开始下一局，请点击准备按钮。", gameState: 'waiting', comparisonDetails: null };
                return {...prev, prompt: "准备开始下一局，请点击准备按钮。", gameState: 'waiting', comparisonDetails: null };
            });
        });
        socket.on('gameInterrupted', (data) => {
            setRoomData(prev => {
                if (!prev) return data;
                return {...prev, ...data};
            });
            showNotification(data.message, 5000);
        });

        socket.on('roomStateUpdate', (data) => {
            if(data.roomId) {
                setRoomId(data.roomId);
                setRoomData(data);
                setCurrentView('room');
                setError('');
                updateMyId(); // Ensure myPlayerId is set if it wasn't during initial connect
            } else {
                setCurrentView('lobby');
                setRoomId(null);
                setRoomData(null);
                showNotification("无法恢复房间状态，请重新加入。");
            }
        });

        return () => {
            socket.off('connect');
            socket.off('roomCreated');
            socket.off('joinedRoom');
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
            socket.off('allPlayersReadyToStartPrompt');
            socket.off('nextRoundReadyPrompt');
            socket.off('gameInterrupted');
            socket.off('roomStateUpdate');
        };
    }, [roomId, currentView, handleArrangementInvalid, myPlayerId]); // Added myPlayerId

    return (
        <div className="App">
            <header className="App-header">
                <h1>多人十三水</h1>
                {myPlayerId && <p className="socket-id-display">My ID: {myPlayerId}</p>}
            </header>
            <main>
                {notification && <div className="notification-bar">{notification}</div>}
                {error && <div className="error-bar">{error}</div>}

                {currentView === 'lobby' && <Lobby />}
                {currentView === 'room' && roomId && roomData && myPlayerId && ( // Ensure myPlayerId is available
                    <Room 
                        roomId={roomId} 
                        roomData={roomData} 
                        myPlayerId={myPlayerId}
                        onArrangementInvalid={handleArrangementInvalid}
                    />
                )}
            </main>
            <footer>
                {socket && socket.io && socket.io.opts && (
                     <p>当前后端目标: {socket.io.opts.hostname}:{socket.io.opts.port}</p>
                )}
                <p>连接状态: {socket && socket.connected ? '已连接' : '未连接'}</p>
            </footer>
        </div>
    );
}

export default App;
