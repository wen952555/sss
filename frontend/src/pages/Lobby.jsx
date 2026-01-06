import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Lobby = () => {
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [userInfo, setUserInfo] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!searchPhone) return;
    try {
      const res = await api.get(`auth.php?action=search&phone=${searchPhone}`);
      setSearchResult(res.data);
    } catch (err) {
      alert('未找到该手机号对应的用户');
    }
  };

  const createRoom = async (type) => {
    try {
      const res = await api.post('game.php?action=create', new URLSearchParams({ type }));
      navigate(`/game/${res.data.roomId}`);
    } catch (err) {
      alert('创建房间失败');
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate('/auth');
  };

  return (
    <div className="lobby">
      <div className="user-bar">
        <div className="info">
          <span>ID: <strong>{userInfo.short_id}</strong></span>
          <span>积分: <strong>{userInfo.points}</strong></span>
        </div>
        <button onClick={logout}>退出</button>
      </div>

      <div className="search-section">
        <h3>查找玩家</h3>
        <div className="search-row">
          <input type="text" placeholder="输入手机号" value={searchPhone} onChange={e => setSearchPhone(e.target.value)} />
          <button onClick={handleSearch}>查询ID</button>
        </div>
        {searchResult && <div className="result">查询结果 ID: {searchResult.short_id}</div>}
      </div>

      <div className="room-section">
        <h3>预约比赛</h3>
        <button onClick={() => createRoom('tonight')}>创建/加入：今晚8点场</button>
        <button onClick={() => createRoom('tomorrow')}>创建/加入：明晚8点场</button>
      </div>
    </div>
  );
};

export default Lobby;