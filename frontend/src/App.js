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
    const [notification, setNotification] = useState(''); // For general notifications


    const showNotification = (message, duration = 3000) => {
        setNotification(message);
        setTimeout(() => setNotification(''), duration);
    };
    
    const handleArrangementInvalid = useCallback((message) => {
        setError(message); // Set error to be displayed, GameBoard can also listen
        // Optionally, clear the error after a few seconds
        setTimeout(() => setError(''), 5000);
    }, []);


    useEffect(() => {
        setMyPlayerId(socket.id); // Set once connected (or reconnected)
        
        const handleConnect = () => {
            setMyPlayerId(socket.id);
            console.log("App.js: Connected with socket ID:", socket.id);
             // If we were in a room and got disconnected, try to rejoin or fetch state
            if (roomId && currentView === 'room') {
                // This is tricky, server might have cleaned up the player.
                // A robust solution would involve session management or re-authentication.
                // For now, we can request the room state.
                // socket.emit('requestRoomState', roomId); // Server needs to handle this gracefully
                console.log("Reconnected, attempting to fetch room state for", roomId);
                // Better: have a mechanism to re-identify the player to the room on server-side
                // Or, the user might have to manually rejoin.
                // For simplicity, we might just reset to lobby on a full disconnect/reconnect.
                // setCurrentView('lobby');
                // setRoomId(null);
                // setRoomData(null);
                // showNotification("重新连接成功，请重新加入房间。");
                socket.emit('requestRoomState', roomId); // Try to get current state
            }
        };

        socket.on('connect', handleConnect);
        
        socket.on('roomCreated', (data) => {
            setRoomId(data.roomId);
            setRoomData(data);
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
            // Update only my hand, other players' hands are hidden
            setRoomData(prevData => {
                const updatedPlayers = prevData.players.map(p =>
                    p.id === socket.id ? { ...p, hand: data.hand, hasSubmitted: false } : p // Reset hasSubmitted
                );
                return { ...prevData, players: updatedPlayers, gameState: data.gameState };
            });
            setError(''); // Clear previous errors like invalid arrangement
            showNotification("已发牌，请理牌！");
        });
        
        socket.on('gameStarted', (data) => {
             setRoomData(prevData => ({ ...prevData, gameState: data.gameState, players: data.players.map(p => ({...p, hasSubmitted: false, isReady: true})) })); // Mark all as ready
             showNotification("游戏开始!");
        });

        socket.on('updateGameState', (data) => {
            setRoomData(prevData => ({ ...prevData, ...data }));
            if(data.gameState === 'comparing'){
                showNotification("所有玩家已提交，开始比牌！");
            }
        });
        
        socket.on('playerSubmitted', ({ playerId, players }) => {
            setRoomData(prevData => ({ ...prevData, players }));
            const submittedPlayer = players.find(p => p.id === playerId);
            if (submittedPlayer) {
                showNotification(`${submittedPlayer.name} 已提交牌型。`);
            }
        });

        socket.on('showResults', (data) => {
            // data includes players with updated scores and arrangedHands, and comparisonDetails
            setRoomData(prevData => ({
                ...prevData,
                players: data.players, // Server now sends full player objects with scores and hands
                comparisonDetails: data.comparisonDetails,
                gameLog: prevData.gameLog ? [...prevData.gameLog, data.logEntry] : [data.logEntry], // Append to log
                gameState: 'comparing' // Or 'ended' if server indicates this, for now 'comparing'
            }));
            // After a short delay, server might send 'updateGameState' to 'waiting' for next round
        });
        
        socket.on('arrangementInvalid', (message) => {
            // This is now handled by handleArrangementInvalid passed to GameBoard
            // setError(message);
            // showNotification(`牌型错误: ${message}`, 5000);
            // GameBoard will locally set its error, App can show a global one too if needed
            handleArrangementInvalid(message); // Call the memoized handler
        });

        socket.on('errorMsg', (message) => {
            setError(message);
            // Clear error after a while
            setTimeout(() => setError(''), 5000);
        });
        
        socket.on('infoMsg', (message) => {
            showNotification(message);
        });

        socket.on('allPlayersReadyToStartPrompt', () => {
            setRoomData(prev => ({...prev, prompt: "所有玩家已就座，房主可以开始游戏 (或等待玩家准备)"}));
        });
        socket.on('nextRoundReadyPrompt', () => {
            setRoomData(prev => ({...prev, prompt: "准备开始下一局，请点击准备按钮。"}));
            // Reset comparison details for the new round visual
            setTimeout(() => { // Delay to allow players to see results
                setRoomData(prev => ({...prev, comparisonDetails: null, gameState: 'waiting' }));
            }, 5000); // Give some time to see results before clearing
        });
        socket.on('gameInterrupted', (data) => {
            setRoomData(prev => ({...prev, ...data}));
            showNotification(data.message, 5000);
        });

        socket.on('roomStateUpdate', (data) => { // For re-connections or refreshes
            if(data.roomId) {
                setRoomId(data.roomId);
                setRoomData(data);
                setCurrentView('room');
                setError('');
            } else {
                // Room no longer exists or player not in it
                setCurrentView('lobby');
                setRoomId(null);
                setRoomData(null);
                showNotification("无法恢复房间状态，请重新加入。");
            }
        });


        return () => {
            // Clean up listeners when component unmounts
            socket.off('connect', handleConnect);
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
            socket.off('arrangementInvalid');
            socket.off('errorMsg');
            socket.off('infoMsg');
            socket.off('allPlayersReadyToStartPrompt');
            socket.off('nextRoundReadyPrompt');
            socket.off('gameInterrupted');
            socket.off('roomStateUpdate');
        };
    }, [roomId, currentView, handleArrangementInvalid]); // Add dependencies for useEffect

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
                {currentView === 'room' && roomId && roomData && (
                    <Room 
                        roomId={roomId} 
                        roomData={roomData} 
                        myPlayerId={myPlayerId}
                        onArrangementInvalid={handleArrangementInvalid} // Pass down the callback
                    />
                )}
            </main>
            <footer>
                <p>当前后端目标: {socket.io.opts.hostname}:{socket.io.opts.port}</p>
                <p>连接状态: {socket.connected ? '已连接' : '未连接'}</p>
            </footer>
        </div>
    );
}

export default App;
