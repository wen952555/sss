import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './LobbyPage.css';

const LobbyPage = () => {
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState({
    rooms: false,
    create: false
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchRooms = async () => {
    try {
      setLoading(prev => ({ ...prev, rooms: true }));
      setError(null);
      const data = await api.get('/game/rooms');
      setRooms(data || []);
    } catch (err) {
      console.error('获取房间列表失败:', err);
      setError({
        message: err.message || '获取房间列表失败',
        details: err.data
      });
    } finally {
      setLoading(prev => ({ ...prev, rooms: false }));
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 15000); // 每15秒刷新
    
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError({ message: '请输入房间名称' });
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, create: true }));
      setError(null);
      const { roomId } = await api.post('/game/create', { name: roomName });
      navigate(`/game/${roomId}`);
    } catch (err) {
      console.error('创建房间失败:', err);
      setError({
        message: err.message || '创建房间失败',
        details: err.data
      });
    } finally {
      setLoading(prev => ({ ...prev, create: false }));
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
          disabled={loading.create}
          onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
        />
        <button 
          onClick={handleCreateRoom}
          disabled={loading.create || !roomName.trim()}
        >
          {loading.create ? '创建中...' : '创建房间'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <strong>错误:</strong> {error.message}
          {error.details && <div className="error-details">{JSON.stringify(error.details)}</div>}
        </div>
      )}

      <div className="room-list">
        <div className="room-list-header">
          <h2>当前房间列表</h2>
          <button 
            onClick={fetchRooms}
            disabled={loading.rooms}
          >
            {loading.rooms ? '刷新中...' : '刷新列表'}
          </button>
        </div>
        
        {loading.rooms && !rooms.length ? (
          <div className="loading-indicator">加载中...</div>
        ) : rooms.length === 0 ? (
          <div className="empty-message">暂无可用房间</div>
        ) : (
          <ul>
            {rooms.map(room => (
              <li key={room.id} className="room-item">
                <div className="room-info">
                  <span className="room-name">{room.id}</span>
                  <span className="room-meta">
                    <span className="room-status">{room.status}</span>
                    <span className="room-players">{room.player_count}/4 玩家</span>
                  </span>
                </div>
                <button 
                  onClick={() => navigate(`/game/${room.id}`)}
                  disabled={room.player_count >= 4 || loading.rooms}
                  className="join-button"
                >
                  {room.player_count >= 4 ? '已满员' : '加入房间'}
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
