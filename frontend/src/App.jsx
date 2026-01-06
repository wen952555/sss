import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Lobby from './pages/Lobby';
import GameRoom from './pages/GameRoom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/auth" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
        <Route path="/game/:roomId" element={<ProtectedRoute><GameRoom /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/lobby" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
