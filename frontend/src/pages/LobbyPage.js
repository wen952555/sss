import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const LobbyPage = () => {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await api.get('/game/rooms');
        setRooms(response || []);
      } catch (err) {
        setError(err.message || '获取房间列表失败');
        console.error('Error fetching rooms:', err);
      }
    };
    fetchRooms();
  }, []);

  const createRoom = async () => {
    try {
      const response = await api.post('/game/create', { name: newRoomName });
      navigate(`/game/${response.roomId}`);
    } catch (err) {
      setError(err.message || '创建房间失败');
      console.error('Error creating room:', err);
    }
  };

  return (
    <div className="lobby-page">
      <h2>游戏大厅</h2>
      
      {error && <div className="error-message">{error}</div>}

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
                <span>房间ID: {room.id}</span>
                <span>状态: {room.status}</span>
                <span>玩家: {room.player_count}/4</span>
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
