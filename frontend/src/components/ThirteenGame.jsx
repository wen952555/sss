import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { getSmartSortedHand } from '../utils/autoSorter';
import { sortCards } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

const ThirteenGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd }) => {
  const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };

  // --- 状态 ---
  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [hasDealt, setHasDealt] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false); // 准备按钮
  const [isReady, setIsReady] = useState(false); // 理牌已提交
  const [players, setPlayers] = useState([]);
  const [gameStatus, setGameStatus] = useState('matching');
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- 轮询 ---
  useEffect(() => {
    if (gameStatus === 'finished') return;

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/game_status.php?roomId=${roomId}&userId=${user.id}`);
        const data = await response.json();
        if (data.success) {
          setGameStatus(data.gameStatus);
          setPlayers(data.players);

          // 检查自己是否已准备
          const me = data.players.find(p => p.id === user.id);
          setIsPreparing(me ? !!me.is_ready : false);

          // 检查是否已发牌
          if (data.hand && !hasDealt) {
            setTopLane(data.hand.top);
            setMiddleLane(data.hand.middle);
            setBottomLane(data.hand.bottom);
            setHasDealt(true);
            setIsReady(false);
          }

          // 结果展示
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

  // --- 准备 ---
  const handlePrepare = async () => {
    if (isPreparing) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const resp = await fetch('/api/player_ready.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, roomId })
      });
      const data = await resp.json();
      if (data.success) {
        setIsPreparing(true);
      } else {
        setErrorMessage(data.message || '准备失败');
      }
    } catch (err) {
      setErrorMessage('与服务器通信失败');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 理牌提交 ---
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

  // --- 平铺玩家横幅 ---
  const renderPlayerBar = () => (
    <div className="player-bar-horizontal">
      {players.map((p, idx) => (
        <div
          key={p.id}
          className={`player-bar-item${p.id === user.id ? ' me' : ''}${p.is_ready ? ' ready' : ''}`}
        >
          <div className={`player-dot${p.is_ready ? ' dot-ready' : ''}`}></div>
          <div className="player-bar-nick">
            {p.id === user.id ? '你' : (p.phone ? `玩家${p.phone.slice(-4)}` : `玩家${idx + 1}`)}
          </div>
          <div className="player-bar-status">
            {p.is_ready ? (hasDealt ? '已提交' : '已准备') : (hasDealt ? '理牌中' : '待准备')}
          </div>
        </div>
      ))}
    </div>
  );

  // --- 未发牌时 UI（准备区） ---
  if (!hasDealt) {
    return (
      <div className="table-root">
        <div className="table-panel">
          <div className="table-top-bar">
            <button onClick={onBackToLobby} className="table-quit-btn">退出</button>
            <div className="table-score-box">十三张</div>
          </div>
          {renderPlayerBar()}
          <div style={{ textAlign: 'center', margin: '28px 0 18px 0', fontSize: '1.22rem', color: '#89f0ff', fontWeight: 600 }}>
            等待所有玩家准备后开始游戏...
          </div>
          <div style={{ textAlign: 'center', margin: '12px 0' }}>
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

  // --- 理牌区 ---
  return (
    <div className="table-root">
      <div className="table-panel">
        <div className="table-top-bar">
          <button onClick={onBackToLobby} className="table-quit-btn">退出</button>
          <div className="table-score-box">{gameMode === 'double' ? '十三张翻倍场' : '十三张普通场'}</div>
        </div>
        {renderPlayerBar()}
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