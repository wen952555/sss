
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../utils/api';
// Gifting component can be added back if its functionality is adapted for HTTP
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
            setError(`Failed to fetch rooms: ${err.message}`);
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
            setError(`Failed to create room: ${err.message}`);
        }
    };

    const handleJoinRoom = (roomId) => {
        if (roomId) {
            navigate(`/game/${roomId}`);
        }
    };

    const getStatusText = (status) => {
        const map = { 'waiting': 'Waiting', 'playing': 'In Game', 'finished': 'Finished' };
        return map[status] || status;
    };

    return (
        <div className="lobby-container">
            <h2>Game Lobby</h2>
            {error && <p className="error-message">{error}</p>}

            <div className="create-room-form">
                <button onClick={handleCreateRoom}>Create New Room</button>
            </div>

            <Gifting token={token} />

            <div className="room-list">
                <h3>Available Rooms</h3>
                {rooms.length > 0 ? (
                    <ul>
                        {rooms.map((room) => (
                            <li key={room.id} className="room-list-item">
                                <div className="room-info">
                                    <span className="room-name">Room: {room.id}</span>
                                    <span className="room-status">Status: {getStatusText(room.status)} ({room.playerCount}/4)</span>
                                    <div className="room-players">
                                        Players: {room.players.map(p => p.name).join(', ') || 'Waiting for players...'}
                                    </div>
                                </div>
                                <div className="room-actions">
                                    {room.status === 'waiting' && room.playerCount < 4 ? (
                                        <button onClick={() => handleJoinRoom(room.id)}>Join</button>
                                    ) : (
                                        <button disabled>Full or In Game</button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No rooms available. Why not create one?</p>
                )}
            </div>
        </div>
    );
};

export default Lobby;
