import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainMenu from './pages/MainMenu';
import LoginPage from './pages/LoginPage';
import PointsPage from './pages/PointsPage';
import BetParserPage from './pages/BetParserPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/bet-parser" element={<BetParserPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/points" element={<PointsPage />} />
    </Routes>
  );
}

export default App;
