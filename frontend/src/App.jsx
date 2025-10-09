// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Game from './components/Game';
import Lobby from './components/Lobby';
import TrialGame from './components/TrialGame';
import './App.css';
import './components/Lobby.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="main-nav">
          <div>
            <Link to="/">游戏大厅</Link>
            <Link to="/trial">离线试玩</Link>
          </div>
        </nav>

        <main>
          <Routes>
            <Route path="/trial" element={<TrialGame />} />
            <Route path="/game/:roomId" element={<Game />} />
            <Route path="/" element={<Lobby />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;