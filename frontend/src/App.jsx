import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Lobby from './pages/Lobby';
import GameTable from './pages/GameTable';

// 简单的路由守卫
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('game_token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/lobby" 
          element={
            <PrivateRoute>
              <Lobby />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/game" 
          element={
            <PrivateRoute>
              <GameTable />
            </PrivateRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/lobby" />} />
      </Routes>
    </div>
  );
}

export default App;