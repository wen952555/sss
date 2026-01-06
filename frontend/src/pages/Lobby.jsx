import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Lobby = () => {
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  const handleSearch = async () => {
    try {
      const res = await axios.get(`/api/auth.php?action=search&phone=${searchPhone}`);
      setSearchResult(res.data);
    } catch (err) { alert('用户不存在'); }
  };

  const createRoom = async (type) => {
      const res = await axios.post('/api/game.php?action=create', new URLSearchParams({ type }));
      navigate(`/game/${res.data.roomId}`);
  };

  return (
    <div className="lobby">
      <header>
        <span>我的ID: {user.short_id}</span>
        <span>积分: {user.points}</span>
      </header>
      
      <div className="search-box">
        <input placeholder="搜索手机号查找ID" onChange={e => setSearchPhone(e.target.value)} />
        <button onClick={handleSearch}>搜索</button>
        {searchResult && <p>查找到ID: {searchResult.short_id}</p>}
      </div>

      <div className="room-actions">
        <button onClick={() => createRoom('tonight')}>今晚8点场</button>
        <button onClick={() => createRoom('tomorrow')}>明晚8点场</button>
      </div>
    </div>
  );
};
export default Lobby;