// frontend/src/pages/Lobby.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { joinGame } from '../api';

const Lobby = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem('game_user');
    if (u) setUser(JSON.parse(u));
  }, []);

  const handleJoin = async (level) => {
    try {
      const res = await joinGame(level);
      if (res.data.status === 'success') {
        // 存一下 session info 如果需要
        navigate('/game');
      } else {
        alert('加入失败，请重试');
      }
    } catch (e) {
      console.error(e);
      alert('网络错误');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar user={user} />
      
      <div className="flex-1 p-4 flex flex-col gap-4 justify-center max-w-md mx-auto w-full">
        {/* 2分场 */}
        <div 
          onClick={() => handleJoin(2)}
          className="bg-gradient-to-r from-green-400 to-green-600 text-white h-32 rounded-xl shadow-lg flex items-center justify-center text-3xl font-bold cursor-pointer active:scale-95 transition"
        >
          2 分场
        </div>

        {/* 5分场 */}
        <div 
          onClick={() => handleJoin(5)}
          className="bg-gradient-to-r from-blue-400 to-blue-600 text-white h-32 rounded-xl shadow-lg flex items-center justify-center text-3xl font-bold cursor-pointer active:scale-95 transition"
        >
          5 分场
        </div>

        {/* 10分场 */}
        <div 
          onClick={() => handleJoin(10)}
          className="bg-gradient-to-r from-purple-400 to-purple-600 text-white h-32 rounded-xl shadow-lg flex items-center justify-center text-3xl font-bold cursor-pointer active:scale-95 transition"
        >
          10 分场
        </div>
      </div>
    </div>
  );
};

export default Lobby;