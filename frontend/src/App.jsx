import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Lobby from './pages/Lobby';
import GameRoom from './pages/GameRoom';

function App() {
  const ProtectedRoute = ({ children }) => {
    return localStorage.getItem('token') ? children : <Navigate to="/auth" />;
  };

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
