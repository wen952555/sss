import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './EightCardGame.css';
import { getSmartSortedHandForEight } from '../utils/eightCardAutoSorter';
import GameResultModal from './GameResultModal';

const EightCardGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd }) => {
  const LANE_LIMITS = { top: 0, middle: 8, bottom: 0 };

  const [middleLane, setMiddleLane] = useState([]);
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
            setMiddleLane(data.hand.middle);
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
    if (middleLane.length !== LANE_LIMITS.middle) {
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
        hand: { top: [], middle: middleLane, bottom: [] },
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

  const areCardsEqual = (card1, card2) =>
    card1 && card2 && card1.rank === card2.rank && card1.suit === card2.suit;

  const handleCardClick = (cardToToggle) => {
    let newSelectedCards = [...selectedCards];
    let newMiddleLane = [...middleLane];

    const findAndRemove = (arr, card) => arr.filter(c => !areCardsEqual(c, card));

    if (newSelectedCards.some(c => areCardsEqual(c, cardToToggle))) {
      newSelectedCards = findAndRemove(newSelectedCards, cardToToggle);
      newMiddleLane.push(cardToToggle); // Put it back in the only lane
    } else {
      newSelectedCards.push(cardToToggle);
      newMiddleLane = findAndRemove(newMiddleLane, cardToToggle);
    }

    setSelectedCards(newSelectedCards);
    setMiddleLane(newMiddleLane);
  };

  const handleLaneClick = (laneName) => {
    if (selectedCards.length === 0) return;
    if (middleLane.length + selectedCards.length > LANE_LIMITS.middle) {
      setErrorMessage(`此道最多只能放 ${LANE_LIMITS.middle} 张牌!`);
      return;
    }
    setMiddleLane([...middleLane, ...selectedCards]);
    setSelectedCards([]);
  };

  const handleAutoSort = () => {
    if (!hasDealt) return;
    const sorted = getSmartSortedHandForEight([...middleLane]);
    if (sorted) {
      setMiddleLane(sorted.middle);
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
        <div className="game-table-title">急速八张 {gameMode === 'special' ? '独头场' : '普通场'}</div>
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
        <Lane title="牌" cards={middleLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
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

export default EightCardGame;