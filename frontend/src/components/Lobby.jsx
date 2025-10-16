
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../utils/api';
import Gifting from './Gifting'; 

const Lobby = ({ token }) => {
    const [rooms, setRooms] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const fetchRooms = useCallback(async () => {
        if (!token) return;
        try {
            const updatedRooms = await api.getRooms(token);
            setRooms(updatedRooms);
        } catch (err) {
            setError(`获取房间列表失败: ${err.message}`);
        }
    }, [token]);

    useEffect(() => {
        fetchRooms(); // Initial fetch
        const intervalId = setInterval(fetchRooms, 5000); // Poll every 5 seconds

        return () => clearInterval(intervalId);
    }, [fetchRooms]);

    const handleCreateRoom = async () => {
        try {
            const newRoom = await api.createRoom(token);
            navigate(`/game/${newRoom.roomId}`);
        } catch (err) {
            setError(`创建房间失败: ${err.message}`);
        }
    };

    const handleJoinRoom = (roomId) => {
        if (roomId) {
            navigate(`/game/${roomId}`);
        }
    };

    const getStatusText = (status) => {
        const map = { 'waiting': '等待中', 'playing': '游戏中', 'finished': '已结束' };
        return map[status] || status;
    };

    return (
        <div className="lobby-container">
            <h2>游戏大厅</h2>
            {error && <p className="error-message">{error}</p>}

            <div className="create-room-form">
                <button onClick={handleCreateRoom}>创建新房间</button>
            </div>

            <Gifting token={token} />

            <div className="room-list">
                <h3>可用房间</h3>
                {rooms.length > 0 ? (
                    <ul>
                        {rooms.map((room) => (
                            <li key={room.id} className="room-list-item">
                                <div className="room-info">
                                    <span className="room-name">房间: {room.id}</span>
                                    <span className="room-status">状态: {getStatusText(room.status)} ({room.playerCount}/4)</span>
                                    <div className="room-players">
                                        玩家: {room.players.map(p => p.name).join(', ') || '等待玩家加入...'}
                                    </div>
                                </div>
                                <div className="room-actions">
                                    {room.status === 'waiting' && room.playerCount < 4 ? (
                                        <button onClick={() => handleJoinRoom(room.id)}>加入</button>
                                    ) : (
                                        <button disabled>满员或游戏中</button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>没有可用的房间，创建一个吧！</p>
                )}
            </div>
        </div>
    );
};

export default Lobby;
