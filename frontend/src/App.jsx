import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import MainMenu from './pages/MainMenu';
import GameRoom from './pages/GameRoom';
import GameResult from './pages/GameResult';

function App() {
    const [user, setUser] = useState(null);
    const [currentView, setCurrentView] = useState('login');

    const handleLogin = (userData) => {
        setUser(userData);
        setCurrentView('main-menu');
    };

    const handleLogout = () => {
        setUser(null);
        setCurrentView('login');
    };

    const navigate = (view) => {
        setCurrentView(view);
    };

    const renderView = () => {
        switch (currentView) {
            case 'login':
                return <Login onLogin={handleLogin} onNavigate={navigate} />;
            case 'register':
                return <Register onLogin={handleLogin} onNavigate={navigate} />;
            case 'main-menu':
                return <MainMenu user={user} onNavigate={navigate} onLogout={handleLogout} />;
            case 'game-room':
                 return <GameRoom user={user} onNavigate={navigate} />;
            case 'game-result':
                return <GameResult onNavigate={navigate} />;
            default:
                return <Login onLogin={handleLogin} onNavigate={navigate} />;
        }
    };

    return (
        <div className="app-container">
            {renderView()}
        </div>
    );
}

export default App;
