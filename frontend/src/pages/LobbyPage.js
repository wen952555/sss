import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './LobbyPage.css';

const LobbyPage = () => {
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const data = await api.get('/game/rooms');
        setRooms(data || []);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('获取房间列表失败:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000); // 每10秒刷新
    
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError('请输入房间名称');
      return;
    }
    
    try {
      setLoading(true);
      const { roomId } = await api.post('/game/create', { name: roomName });
      navigate(`/game/${roomId}`);
    } catch (err) {
      setError(err.message || '创建房间失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lobby-container">
      <h1>游戏大厅</h1>
      
      <div className="create-room-section">
        <input
          type="text"
          placeholder="输入房间名称"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          disabled={loading}
        />
        <button 
          onClick={handleCreateRoom}
          disabled={loading || !roomName.trim()}
        >
          {loading ? '创建中...' : '创建房间'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="room-list">
        <h2>当前房间列表</h2>
        {loading && !rooms.length ? (
          <p>加载中...</p>
        ) : rooms.length === 0 ? (
          <p>暂无可用房间</p>
        ) : (
          <ul>
            {rooms.map(room => (
              <li key={room.id}>
                <div className="room-info">
                  <span className="room-name">{room.id}</span>
                  <span className="room-status">{room.status}</span>
                  <span className="room-players">{room.player_count}/4 玩家</span>
                </div>
                <button 
                  onClick={() => navigate(`/game/${room.id}`)}
                  disabled={room.player_count >= 4}
                >
                  加入房间
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LobbyPage;
