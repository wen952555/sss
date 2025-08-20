// --- START OF FILE frontend/src/components/ThirteenGame.jsx (FINAL DB VERSION) ---

import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { getSmartSortedHand } from '../utils/autoSorter';
import { sortCards } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const ThirteenGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd }) => {
  const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };

  // --- 本地状态: 玩家自己的手牌和理牌操作 ---
  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [hasDealt, setHasDealt] = useState(false); // 标记是否已收到手牌

  // --- 同步状态: 从服务器轮询获取 ---
  const [players, setPlayers] = useState([]);
  const [gameStatus, setGameStatus] = useState('matching'); // 'matching', 'playing', 'finished'
  const [gameResult, setGameResult] = useState(null);

  // --- UI状态 ---
  const [isLoading, setIsLoading] = useState(false); // 用于提交按钮
  const [errorMessage, setErrorMessage] = useState('');
  const [isReady, setIsReady] = useState(false); // 玩家自己是否已提交

  // --- 轮询逻辑 ---
  useEffect(() => {
    if (gameStatus === 'finished') return; // 游戏结束，停止轮询

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/game_status.php?roomId=${roomId}&userId=${user.id}`);
        const data = await response.json();

        if (data.success) {
          setGameStatus(data.gameStatus);
          setPlayers(data.players);

          // 第一次收到手牌数据
          if (data.hand && !hasDealt) {
            setTopLane(data.hand.top);
            setMiddleLane(data.hand.middle);
            setBottomLane(data.hand.bottom);
            setHasDealt(true);
          }

          if (data.gameStatus === 'finished' && data.result) {
            setGameResult(data.result);
            // 这里可以添加更新用户积分的逻辑，如果后端返回了更新后的用户信息
            // if (data.updatedUser) onGameEnd(data.updatedUser);
            clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        setErrorMessage("与服务器断开连接");
        clearInterval(intervalId); // 出错时停止轮询
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [roomId, user.id, gameStatus, hasDealt, onGameEnd]);

  // --- 卡牌操作逻辑 (handleCardClick, handleLaneClick, handleAutoSort) ---
  // ... 这些函数的代码与之前版本完全相同，此处省略 ...

  const handleConfirm = async () => {
    if (isLoading || isReady) return;
    if (topLane.length !== LANE_LIMITS.top || middleLane.length !== LANE_LIMITS.middle || bottomLane.length !== LANE_LIMITS.bottom) {
        setErrorMessage(`牌道数量错误！`);
        return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const payload = {
      userId: user.id,
      roomId: roomId,
      hand: { top: topLane, middle: middleLane, bottom: bottomLane },
    };

    try {
      const response = await fetch('/api/player_ready.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data.success) {
        setIsReady(true);
      } else {
        setErrorMessage(data.message || '提交失败');
      }
    } catch (err) {
      setErrorMessage('与服务器通信失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseResult = () => {
    setGameResult(null);
    onBackToLobby();
  };

  const getGameModeName = (mode) => { /* ... 此函数不变 ... */ };

  if (!hasDealt) {
    return <div className="loading-overlay" style={{position: 'static', background: 'transparent'}}>正在等待游戏开始...</div>;
  }

  return (
    <div className="table-root">
      <div className="table-panel">
        <div className="table-top-bar">
          <button onClick={onBackToLobby} className="table-quit-btn">退出游戏</button>
          <div className="table-score-box">{getGameModeName(gameMode)}</div>
        </div>

        <div className="players-status-bar">
          {players.map(p => (
            <div key={p.id} className={`player-status-item ${p.is_ready ? 'ready' : ''} ${p.id === user.id ? 'you' : ''}`}>
              <span className="player-name">{p.id === user.id ? `你` : `玩家 ${p.phone.slice(-4)}`}</span>
              <span className="status-text">{p.is_ready ? '已准备' : '理牌中...'}</span>
            </div>
          ))}
        </div>

        <div className="table-lanes-area">
          <Lane title="头道" cards={topLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
          <Lane title="中道" cards={middleLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
          <Lane title="尾道" cards={bottomLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('bottom')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} />
        </div>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <div className="table-actions-bar">
          <button onClick={handleAutoSort} className="action-btn orange" disabled={isReady}>自动理牌</button>
          <button onClick={handleConfirm} disabled={isLoading || isReady} className="action-btn green">
            {isReady ? '等待其他玩家...' : (isLoading ? '提交中...' : '确认牌型')}
          </button>
        </div>

      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default ThirteenGame;

// --- END OF FILE frontend/src/components/ThirteenGame.jsx (FINAL DB VERSION) ---