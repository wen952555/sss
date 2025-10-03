// frontend/src/components/Lobby.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket'; // Use the shared socket instance

const Lobby = () => {
  const [roomId, setRoomId] = useState('');
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Request the initial list of rooms when component mounts
    socket.emit('get_rooms');

    // Listen for updates to the room list
    const handleRoomsUpdate = (updatedRooms) => {
      setRooms(updatedRooms);
    };
    socket.on('rooms_update', handleRoomsUpdate);

    // Clean up the listener when the component unmounts
    return () => {
      socket.off('rooms_update', handleRoomsUpdate);
    };
  }, []);

  const handleJoinRoom = (id) => {
    const roomToJoin = id || roomId.trim();
    if (roomToJoin) {
      navigate(`/game/${roomToJoin}`);
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

      <div className="room-list">
        <h3>可用房间列表</h3>
        {rooms.length > 0 ? (
          <ul>
            {rooms.map((room) => (
              <li key={room.id}>
                <span>房间: {room.id} ({room.playerCount}/4) - {room.status}</span>
                {room.status === 'waiting' && room.playerCount < 4 ? (
                  <button onClick={() => handleJoinRoom(room.id)}>加入</button>
                ) : (
                  <button disabled>满员或游戏中</button>
                )}
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