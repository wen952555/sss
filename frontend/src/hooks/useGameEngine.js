import { useState, useEffect } from 'react';

export const useGameEngine = (roomId, userId, onGameEnd) => {
  const [gameStatus, setGameStatus] = useState('matching');
  const [players, setPlayers] = useState([]);
  const [hand, setHand] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (gameStatus === 'finished' || !roomId || !userId) return;

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/game_status.php?roomId=${roomId}&userId=${userId}`);
        const data = await response.json();

        if (data.success) {
          setGameStatus(data.gameStatus);
          setPlayers(data.players);

          if (data.hand && !hand) {
            setHand(data.hand);
          }

          if (data.gameStatus === 'finished' && data.result) {
            setGameResult(data.result);
            if (onGameEnd) {
                const updatedUser = data.result.players.find(p => p.id === userId);
                if (updatedUser) onGameEnd(updatedUser);
            }
            clearInterval(intervalId);
          }
        }
      } catch (error) {
        setErrorMessage("与服务器断开连接");
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [roomId, userId, gameStatus, hand, onGameEnd]);

  return { gameStatus, players, hand, gameResult, errorMessage, setGameResult };
};
