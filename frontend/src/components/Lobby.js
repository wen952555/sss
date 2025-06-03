// frontend/src/components/Lobby.js
import React, { useState } from 'react';
import socket from '../socket';
import './Lobby.css';

const Lobby = ({ onJoinRoom }) => {
    const [playerName, setPlayerName] = useState('');
    const [roomIdToJoin, setRoomIdToJoin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);


    const handleCreateRoom = () => {
        if (!playerName.trim()) {
            setError('请输入你的昵称');
            return;
        }
        setError('');
        setIsLoading(true);
        socket.emit('createRoom', { playerName });
        // 后续的 onJoinRoom 将由 App.js 中的 'roomCreated' 或 'joinedRoom' 事件触发
    };

    const handleJoinRoom = () => {
        if (!playerName.trim()) {
            setError('请输入你的昵称');
            return;
        }
        if (!roomIdToJoin.trim()) {
            setError('请输入房间号');
            return;
        }
        setError('');
        setIsLoading(true);
        socket.emit('joinRoom', { roomId: roomIdToJoin, playerName });
    };
    
    // App.js会监听socket事件并处理isLoading
    // 这里只是简单示例，实际中 App.js 的socket监听器会处理 setIsLoaded
    // socket.on('roomCreated', () => setIsLoading(false));
    // socket.on('joinedRoom', () => setIsLoading(false));
    // socket.on('errorMsg', (msg) => { setError(msg); setIsLoading(false); });


    return (
        <div className="lobby-container">
            <h2>十三水游戏大厅</h2>
            {error && <p className="error-message">{error}</p>}
            <div className="input-group">
                <label htmlFor="playerName">昵称:</label>
                <input
                    type="text"
                    id="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="输入你的昵称"
                    disabled={isLoading}
                />
            </div>
            <div className="room-actions">
                <button onClick={handleCreateRoom} disabled={isLoading || !playerName.trim()}>
                    {isLoading ? '创建中...' : '创建房间'}
                </button>
                <div className="join-room-group">
                    <input
                        type="text"
                        value={roomIdToJoin}
                        onChange={(e) => setRoomIdToJoin(e.target.value)}
                        placeholder="输入房间号"
                        disabled={isLoading}
                    />
                    <button onClick={handleJoinRoom} disabled={isLoading || !playerName.trim() || !roomIdToJoin.trim()}>
                        {isLoading ? '加入中...' : '加入房间'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Lobby;
