// --- START OF FILE frontend/src/components/ThirteenGame.jsx (准备后发牌版) ---

import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { getSmartSortedHand } from '../utils/autoSorter';
import { sortCards } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card1.rank && card1.suit === card2.suit;
};

const ThirteenGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd }) => {
  const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };

  // --- 本地状态 ---
  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [hasDealt, setHasDealt] = useState(false); // 是否已发牌
  const [isReady, setIsReady] = useState(false); // 是否已提交理牌
  const [players, setPlayers] = useState([]);
  const [gameStatus, setGameStatus] = useState('matching'); // 牌桌状态
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- 轮询游戏状态 ---
  useEffect(() => {
    if (gameStatus === 'finished') return;

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/game_status.php?roomId=${roomId}&userId=${user.id}`);
        const data = await response.json();
        if (data.success) {
          setGameStatus(data.gameStatus);
          setPlayers(data.players);

          const me = data.players.find(p => p.id === user.id);
          if (me) {
            setIsReady(!!me.is_ready);
          }

          if (data.hand && !hasDealt) {
            setTopLane(data.hand.top);
            setMiddleLane(data.hand.middle);
            setBottomLane(data.hand.bottom);
            setHasDealt(true);
          }

          if (data.gameStatus === 'finished' && data.result) {
            setGameResult(data.result);
            if (onGameEnd) {
                const updatedUser = data.result.players.find(p => p.id === user.id);
                if(updatedUser) onGameEnd(updatedUser);
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
  }, [roomId, user.id, gameStatus, hasDealt, onGameEnd]);

  const handleConfirm = async () => {
    if (isLoading || isReady) return;
    if (topLane.length !== LANE_LIMITS.top || middleLane.length !== LANE_LIMITS.middle || bottomLane.length !== LANE_LIMITS.bottom) {
      setErrorMessage(`牌道数量错误！`);
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const payload = {
        userId: user.id,
        roomId: roomId,
        hand: { top: topLane, middle: middleLane, bottom: bottomLane },
      };
      const response = await fetch('/api/submit_hand.php', {
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

  // --- 自动理牌 ---
  const handleAutoSort = () => {
    if (!hasDealt) return;
    const sorted = getSmartSortedHand([...topLane, ...middleLane, ...bottomLane]);
    if (sorted) {
      setTopLane(sorted.top);
      setMiddleLane(sorted.middle);
      setBottomLane(sorted.bottom);
    }
  };

  const handleCloseResult = () => {
    setGameResult(null);
    onBackToLobby();
  };

  // --- 未发牌时 UI（准备区） ---
  if (!hasDealt) {
    return (
      <div className="table-root">
        <div className="table-panel">
          <div className="table-top-bar">
            <button onClick={onBackToLobby} className="table-quit-btn">退出游戏</button>
            <div className="table-score-box">十三张</div>
          </div>
          <div className="players-status-bar">
            {players.map(p => (
              <div key={p.id} className={`player-status-item ${p.is_ready ? 'ready' : ''} ${p.id === user.id ? 'you' : ''}`}>
                <span className="player-name">{p.id === user.id ? '你' : `玩家${p.phone.slice(-4)}`}</span>
                <span className="status-text">{p.is_ready ? '已准备' : '未准备'}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', margin: '24px 0', fontSize: '1.25rem', color: '#3b3b8e' }}>
            等待所有玩家准备后开始游戏...
          </div>
          <div style={{ textAlign: 'center' }}>
            {!isPreparing ? (
              <button className="action-btn green" onClick={handlePrepare} disabled={isLoading}>
                {isLoading ? '准备中...' : '点击准备'}
              </button>
            ) : (
              <div style={{ color: '#27ae60', fontWeight: 'bold' }}>你已准备，等待其他玩家...</div>
            )}
          </div>
          {errorMessage && <p className="error-message">{errorMessage}</p>}
        </div>
      </div>
    );
  }

  // --- 已发牌后，显示理牌区 ---
  return (
    <div className="table-root">
      <div className="table-panel">
        <div className="table-top-bar">
          <button onClick={onBackToLobby} className="table-quit-btn">退出游戏</button>
          <div className="table-score-box">{gameMode === 'double' ? '十三张翻倍场' : '十三张普通场'}</div>
        </div>
        <div className="players-status-bar">
          {players.map(p => (
            <div key={p.id} className={`player-status-item ${p.is_ready ? 'ready' : ''} ${p.id === user.id ? 'you' : ''}`}>
              <span className="player-name">{p.id === user.id ? `你` : `玩家 ${p.phone.slice(-4)}`}</span>
              <span className="status-text">{p.is_ready ? '已提交' : '理牌中...'}</span>
            </div>
          ))}
        </div>
        <div className="table-lanes-area">
          <Lane title="头道" cards={topLane} onCardClick={null} onLaneClick={null} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
          <Lane title="中道" cards={middleLane} onCardClick={null} onLaneClick={null} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
          <Lane title="尾道" cards={bottomLane} onCardClick={null} onLaneClick={null} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} />
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

// --- END OF FILE frontend/src/components/ThirteenGame.jsx (准备后发牌版) ---