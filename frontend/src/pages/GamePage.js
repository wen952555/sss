import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import api from '../services/api';
import './GamePage.css';

const GamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState(null);
  const [userCards, setUserCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [message, setMessage] = useState('');
  const [players, setPlayers] = useState([]);
  const [aiEnabled, setAiEnabled] = useState(false);

  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const response = await api.get(`/game/state/${roomId}`);
        setGameState(response.data);
        setUserCards(response.data.players.find(p => p.id === localStorage.getItem('userId'))?.cards || []);
        setPlayers(response.data.players);
      } catch (error) {
        console.error('Error fetching game state:', error);
      }
    };

    fetchGameState();
    const interval = setInterval(fetchGameState, 5000);
    return () => clearInterval(interval);
  }, [roomId]);

  const handleCardClick = (cardIndex) => {
    if (selectedCards.includes(cardIndex)) {
      setSelectedCards(selectedCards.filter(i => i !== cardIndex));
    } else {
      setSelectedCards([...selectedCards, cardIndex]);
    }
  };

  const arrangeCards = async (arrangement) => {
    try {
      await api.post(`/game/arrange/${roomId}`, {
        userId: localStorage.getItem('userId'),
        arrangement
      });
      setMessage('Cards arranged successfully');
    } catch (error) {
      setMessage('Error arranging cards');
    }
  };

  const useAiArrangement = async () => {
    try {
      const response = await api.post(`/game/ai-arrange/${roomId}`, {
        userId: localStorage.getItem('userId')
      });
      setUserCards(response.data.cards);
      setMessage('AI has arranged your cards');
    } catch (error) {
      setMessage('Error using AI arrangement');
    }
  };

  const readyToPlay = async () => {
    try {
      await api.post(`/game/ready/${roomId}`, {
        userId: localStorage.getItem('userId')
      });
      setMessage('You are ready to play');
    } catch (error) {
      setMessage('Error setting ready status');
    }
  };

  return (
    <div className="game-container">
      <h2>Room: {roomId}</h2>
      
      <div className="players-list">
        {players.map(player => (
          <div key={player.id} className="player-info">
            <span>{player.name}</span>
            <span>Points: {player.points}</span>
            <span>{player.ready ? 'Ready' : 'Not Ready'}</span>
          </div>
        ))}
      </div>
      
      <div className="card-area">
        {userCards.map((card, index) => (
          <Card
            key={index}
            card={card}
            faceDown={false}
            onClick={() => handleCardClick(index)}
            selected={selectedCards.includes(index)}
          />
        ))}
      </div>
      
      <div className="game-controls">
        <button onClick={() => arrangeCards(selectedCards)}>Arrange Selected</button>
        <button onClick={useAiArrangement}>AI Arrange</button>
        <button onClick={readyToPlay}>Ready</button>
        <label>
          <input 
            type="checkbox" 
            checked={aiEnabled} 
            onChange={(e) => setAiEnabled(e.target.checked)} 
          />
          Enable AI Assistant
        </label>
      </div>
      
      {message && <div className="message">{message}</div>}
    </div>
  );
};

export default GamePage;
