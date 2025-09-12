import React, { useState, useEffect } from 'react';
import ForceLandscape from '../components/common/ForceLandscape';
import './DoudizhuPage.css';

const API_BASE_URL = 'http://localhost/api/doudizhu.php';

const DoudizhuPage = () => {
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const createNewGame = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}?action=createGame`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
          // In future steps, we will fetch and set the game state.
          console.log("Dou Di Zhu game created with ID:", data.game_id);
          // For now, we'll just set a dummy game object to move past loading.
          setGame({ id: data.game_id });
        } else {
          setError(data.message || '创建游戏失败。');
        }
      } catch (err) {
        setError('无法连接到服务器。');
      }
    };

    createNewGame();
  }, []);

  return (
    <div className="doudizhu-page">
      <ForceLandscape />
      <div className="game-content-wrapper">
        <div className="game-header">
          <h1>斗地主</h1>
        </div>
        {error && <div className="error-message">{error}</div>}
        {!game && !error && <div className="loading">加载中...</div>}
        {game && (
          <div className="doudizhu-board">
            <p>“斗地主”游戏界面 - 施工中</p>
            {/* The UI for the 3-player game, bidding, and landlord's kitty will be built here. */}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoudizhuPage;
