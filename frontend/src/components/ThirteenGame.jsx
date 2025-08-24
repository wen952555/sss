import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { getSmartSortedHand } from '../utils/autoSorter';
import GameResultModal from './GameResultModal';

const ThirteenGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd }) => {
  const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };

  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [hasDealt, setHasDealt] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameStatus, setGameStatus] = useState('matching');
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
          setIsPreparing(me ? !!me.is_ready : false);
          if (data.hand && !hasDealt) {
            setTopLane(data.hand.top);
            setMiddleLane(data.hand.middle);
            setBottomLane(data.hand.bottom);
            setHasDealt(true);
            setIsReady(false);
          }
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
      await fetch('/api/player_action.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, roomId, action })
      });
    } catch (err) {
      setErrorMessage('与服务器通信失败');
    } finally {
      setIsLoading(false);
    }
  };

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
        action: 'submit_hand',
        hand: { top: topLane, middle: middleLane, bottom: bottomLane },
      };
      await fetch('/api/player_action.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      setErrorMessage('与服务器通信失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = (cardToToggle) => {
    let newSelectedCards = [...selectedCards];
    let newTopLane = [...topLane];
    let newMiddleLane = [...middleLane];
    let newBottomLane = [...bottomLane];

    const findAndRemove = (arr, card) => arr.filter(c => !(c.rank === card.rank && c.suit === card.suit));

    if (newSelectedCards.some(c => areCardsEqual(c, cardToToggle))) {
      newSelectedCards = findAndRemove(newSelectedCards, cardToToggle);
      // Find where it was and put it back
      // This is a simplified logic, assumes card goes back to a general pool (not implemented)
      // A better implementation would track original lane. For now, we just deselect.
    } else {
      newSelectedCards.push(cardToToggle);
      newTopLane = findAndRemove(newTopLane, cardToToggle);
      newMiddleLane = findAndRemove(newMiddleLane, cardToToggle);
      newBottomLane = findAndRemove(newBottomLane, cardToToggle);
    }

    setSelectedCards(newSelectedCards);
    setTopLane(newTopLane);
    setMiddleLane(newMiddleLane);
    setBottomLane(newBottomLane);
  };

  const handleLaneClick = (laneName) => {
    if (selectedCards.length === 0) return;

    const laneSetters = {
      top: setTopLane,
      middle: setMiddleLane,
      bottom: setBottomLane,
    };
    const lanes = {
      top: topLane,
      middle: middleLane,
      bottom: bottomLane,
    };

    const targetLane = lanes[laneName];
    const setter = laneSetters[laneName];
    const limit = LANE_LIMITS[laneName.replace('Lane', '')];

    if (targetLane.length + selectedCards.length > limit) {
      setErrorMessage(`此道最多只能放 ${limit} 张牌!`);
      return;
    }

    setter([...targetLane, ...selectedCards]);
    setSelectedCards([]);
  };

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

  return (
    <div className="game-table-container">
      <div className="game-table-header">
        <button onClick={onBackToLobby} className="table-action-btn back-btn">&larr; 退出</button>
        <div className="game-table-title">十三张 {gameMode === 'double' ? '翻倍场' : '普通场'}</div>
      </div>
      <div className="players-status-container">
        {players.map(p => (
          <div key={p.id} className={`player-status ${p.id === user.id ? 'is-me' : ''} ${p.is_ready ? 'is-ready' : ''}`}>
            <div className="player-avatar">{p.phone.slice(-2)}</div>
            <div className="player-info">
              <div className="player-name">{p.id === user.id ? '你' : `玩家${p.phone.slice(-4)}`}</div>
              <div className="player-ready-text">{hasDealt ? (p.is_ready ? '已提交' : '理牌中...') : (p.is_ready ? '已准备' : '未准备')}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="lanes-container">
        {!hasDealt && <div className="card-deck-placeholder">牌墩</div>}
        <Lane title="头道" cards={topLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
        <Lane title="中道" cards={middleLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
        <Lane title="尾道" cards={bottomLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('bottom')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} />
      </div>
      {errorMessage && <p className="error-text">{errorMessage}</p>}
      <div className="game-table-footer">
        {!hasDealt ? (
          <button className="table-action-btn confirm-btn" onClick={handleReadyToggle} disabled={isLoading}>
            {isLoading ? '请稍候...' : (isPreparing ? '取消准备' : '点击准备')}
          </button>
        ) : (
          <>
            <button onClick={handleAutoSort} className="table-action-btn sort-btn" disabled={isReady}>自动理牌</button>
            <button onClick={handleConfirm} disabled={isLoading || isReady} className="table-action-btn confirm-btn">
              {isReady ? '等待开牌' : (isLoading ? '提交中...' : '确认')}
            </button>
          </>
        )}
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default ThirteenGame;