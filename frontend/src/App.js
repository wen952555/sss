import React, { useState } from 'react';
import GameTable from './components/GameTable';
import Recognition from './components/Recognition';
import './styles.css';

function App() {
  const [view, setView] = useState('game'); // 'game' 或 'recognition'
  
  return (
    <div className="app">
      <header className="header">
        <h1>十三水游戏</h1>
        <div className="nav">
          <button 
            className={`nav-btn ${view === 'game' ? 'active' : ''}`}
            onClick={() => setView('game')}
          >
            游戏桌
          </button>
          <button 
            className={`nav-btn ${view === 'recognition' ? 'active' : ''}`}
            onClick={() => setView('recognition')}
          >
            扑克识别
          </button>
        </div>
      </header>
      
      <main>
        {view === 'game' ? <GameTable /> : <Recognition />}
      </main>
      
      <footer className="footer">
        <p>部署在 Cloudflare Pages | 后端: serv00 PHP</p>
        <p>前端: https://xxx.9525.ip-ddns.com | 后端: https://9525.ip-ddns.com</p>
      </footer>
    </div>
  );
}

export default App;
