import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const LobbyPage = () => {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await api.get('/game/rooms');
        setRooms(response);
      } catch (error) {
        console.error('Error fetching rooms:', error);
      }
    };
    fetchRooms();
  }, []);

  const createRoom = async () => {
    try {
      const response = await api.post('/game/create', { name: newRoomName });
      navigate(`/game/${response.roomId}`);
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  return (
    <div className="lobby-page">
      <h2>游戏大厅</h2>
      <div className="create-room">
        <input
          type="text"
          placeholder="房间名称"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
        />
        <button onClick={createRoom}>创建房间</button>
      </div>
      <div className="room-list">
        <h3>可用房间</h3>
        {rooms.length === 0 ? (
          <p>没有可用房间</p>
        ) : (
          <ul>
            {rooms.map((room) => (
              <li key={room.id}>
                <span>{room.name}</span>
                <span>{room.players.length}/4 玩家</span>
                <button onClick={() => navigate(`/game/${room.id}`)}>加入</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LobbyPage;
