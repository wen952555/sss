// frontend/src/components/Lobby.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket'; // Use the shared socket instance
import Gifting from './Gifting'; // Import the new Gifting component

const Lobby = ({ token }) => { // Accept token as a prop
  const [roomId, setRoomId] = useState('');
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Pass token for authentication when connecting
    if (!socket.connected) {
      socket.auth = { token };
      socket.connect();
    }

    socket.emit('get_rooms');

    const handleRoomsUpdate = (updatedRooms) => {
      setRooms(updatedRooms);
    };
    socket.on('rooms_update', handleRoomsUpdate);

    return () => {
      socket.off('rooms_update', handleRoomsUpdate);
    };
  }, [token]);

  const handleJoinRoom = (id) => {
    const roomToJoin = id || roomId.trim();
    if (roomToJoin) {
      navigate(`/game/${roomToJoin}`);
    }
  };

  const getStatusInChinese = (status) => {
    switch (status) {
      case 'waiting':
        return '等待中';
      case 'playing':
        return '游戏中';
      case 'finished':
        return '已结束';
      default:
        return status;
    }
  };

  return (
    <div className="lobby-container">
      <h2>游戏大厅</h2>

      <div className="join-room-form">
        <input
          type="text"
          placeholder="输入新房间号以创建"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={() => handleJoinRoom()}>创建或加入房间</button>
      </div>

      <Gifting token={token} />

      <div className="room-list">
        <h3>可用房间列表</h3>
        {rooms.length > 0 ? (
          <ul>
            {rooms.map((room) => (
              <li key={room.id} className="room-list-item">
                <div className="room-info">
                  <span className="room-name">房间: {room.id}</span>
                  <span className="room-status">状态: {getStatusInChinese(room.status)} ({room.playerCount}/4)</span>
                  <div className="room-players">
                    玩家: {room.players.join(', ') || '等待中...'}
                  </div>
                </div>
                <div className="room-actions">
                  {room.status === 'waiting' && room.playerCount < 4 ? (
                    <button onClick={() => handleJoinRoom(room.id)}>加入</button>
                  ) : (
                    <button disabled>房间已满或正在游戏</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>当前没有可用的房间，快创建一个吧！</p>
        )}
      </div>
    </div>
  );
};

export default Lobby;