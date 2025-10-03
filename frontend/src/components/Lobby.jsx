// frontend/src/components/Lobby.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Lobby = () => {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/game/${roomId.trim()}`);
    }
  };

  return (
    <div className="lobby-container">
      <h2>游戏大厅</h2>
      <p>请输入房间号加入或创建一个新房间。</p>
      <div className="join-room-form">
        <input
          type="text"
          placeholder="输入房间号"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={handleJoinRoom}>进入房间</button>
      </div>
    </div>
  );
};

export default Lobby;