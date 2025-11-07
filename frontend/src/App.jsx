import React, { useState } from 'react';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import './assets/main.css';

function App() {
  // 简单的状态管理来切换页面，未来可以用React Router替代
  const [currentPage, setCurrentPage] = useState('lobby'); // 'lobby' 或 'game'
  const [selectedTable, setSelectedTable] = useState(null);

  // 模拟进入游戏
  const enterGame = (tableId) => {
    setSelectedTable(tableId);
    setCurrentPage('game');
  }

  const backToLobby = () => {
    setCurrentPage('lobby');
    setSelectedTable(null);
  }

  return (
    <div className="App">
      {currentPage === 'lobby' && <Lobby onEnterGame={enterGame} />} 
      {currentPage === 'game' && <Game tableId={selectedTable} onBack={backToLobby} />} 
    </div>
  );
}

// 更新 Lobby.jsx, 让它能调用 onEnterGame
// 在 Lobby.jsx 的 button 中添加 onClick={() => props.onEnterGame(table.table_id)}

export default App;