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
  const [isPreparing, setIsPreparing] = useState(false); // 是否已点击准备
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

          // --- 1. 检查自己是否已准备 ---
          const me = data.players.find(p => p.id === user.id);
          setIsPreparing(me ? !!me.is_ready : false);

          // --- 2. 检查是否已发牌 ---
          if (data.hand && !hasDealt) {
            setTopLane(data.hand.top);
            setMiddleLane(data.hand.middle);
            setBottomLane(data.hand.bottom);
            setHasDealt(true);
            setIsReady(false); // 理牌还没提交
          }

          // --- 3. 结果展示 ---
          if (data.gameStatus === 'finished' && data.result) {
            setGameResult(data.result);
            clearInterval(intervalId);
          }
        }
      } catch (error) {
        setErrorMessage("与服务器断开连接");
        clearInterval(intervalId);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [roomId, user.id, gameStatus, hasDealt]);

  const handleReadyToggle = async () => {
    setIsLoading(true);
    setErrorMessage('');
    const action = isPreparing ? 'unready' : 'ready';
    try {
      const resp = await fetch('/api/player_action.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, roomId, action })
      });
      const data = await resp.json();
      if (data.success) {
        // The useEffect polling will update the isPreparing state
      } else {
        setErrorMessage(data.message || '操作失败');
      }
    } catch (err) {
      setErrorMessage('与服务器通信失败');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. 理牌提交 ---
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

  // --- UI Rendering ---
  const renderPlayerStatus = () => (
    <div className="players-status-container">
      {players.map(p => (
        <div key={p.id} className={`player-status ${p.id === user.id ? 'is-me' : ''} ${p.is_ready ? 'is-ready' : ''}`}>
          <div className="player-avatar">{p.phone.slice(-2)}</div>
          <div className="player-info">
            <div className="player-name">{p.id === user.id ? '你' : `玩家${p.phone.slice(-4)}`}</div>
            <div className="player-ready-text">{isPreparing ? (p.is_ready ? '已提交' : '理牌中...') : (p.is_ready ? '已准备' : '未准备')}</div>
          </div>
        </div>
      ))}
    </div>
  );

  if (!hasDealt) {
    return (
      <div className="game-table-container pre-deal">
        <div className="game-table-header">
          <button onClick={onBackToLobby} className="table-action-btn back-btn">&larr; 退出</button>
          <div className="game-table-title">十三张 {gameMode === 'double' ? '翻倍场' : '普通场'}</div>
        </div>
        <div className="pre-deal-content">
          {renderPlayerStatus()}
          <div className="waiting-text">等待玩家准备...</div>
          <button className="table-action-btn confirm-btn" onClick={handleReadyToggle} disabled={isLoading}>
            {isLoading ? '请稍候...' : (isPreparing ? '取消准备' : '点击准备')}
          </button>
          {errorMessage && <p className="error-text">{errorMessage}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="game-table-container">
      <div className="game-table-header">
        <button onClick={onBackToLobby} className="table-action-btn back-btn">&larr; 退出</button>
        <div className="game-table-title">十三张 {gameMode === 'double' ? '翻倍场' : '普通场'}</div>
      </div>
      {renderPlayerStatus()}
      <div className="lanes-container">
        <Lane title="头道" cards={topLane} onCardClick={() => {}} onLaneClick={() => {}} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
        <Lane title="中道" cards={middleLane} onCardClick={() => {}} onLaneClick={() => {}} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
        <Lane title="尾道" cards={bottomLane} onCardClick={() => {}} onLaneClick={() => {}} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} />
      </div>
      {errorMessage && <p className="error-text">{errorMessage}</p>}
      <div className="game-table-footer">
        <button onClick={handleAutoSort} className="table-action-btn sort-btn" disabled={isReady}>自动理牌</button>
        <button onClick={handleConfirm} disabled={isLoading || isReady} className="table-action-btn confirm-btn">
          {isReady ? '等待开牌' : (isLoading ? '提交中...' : '确认')}
        </button>
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default ThirteenGame;