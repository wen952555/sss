import React, { useState, useEffect } from 'react';
import Lane from './Lane';
import GameResultModal from './GameResultModal';
import { getSmartSortedHand } from '../utils/autoSorter';

const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };
const areCardsEqual = (a, b) => a.rank === b.rank && a.suit === b.suit;

const ThirteenGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd }) => {
  // --- 状态管理 ---
  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [hasDealt, setHasDealt] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- 轮询房间状态 ---
  useEffect(() => {
    let intervalId;
    const fetchStatus = async () => {
      try {
        const resp = await fetch(`/api/game_status.php?roomId=${roomId}&userId=${user.id}`);
        const data = await resp.json();
        if (data.success) {
          setPlayers(data.players);
          if (data.hand && !hasDealt) {
            setTopLane(data.hand.top); setMiddleLane(data.hand.middle); setBottomLane(data.hand.bottom);
            setHasDealt(true); setIsReady(false);
          }
          if (data.gameStatus === 'finished' && data.result) {
            setGameResult(data.result);
            clearInterval(intervalId);
          }
        }
      } catch {
        setErrorMessage('网络异常');
        clearInterval(intervalId);
      }
    };
    fetchStatus();
    intervalId = setInterval(fetchStatus, 1200);
    return () => clearInterval(intervalId);
  }, [roomId, user.id, hasDealt]);

  // --- 玩家横幅平铺 ---
  const renderPlayerBar = () => (
    <div className="player-bar-horizontal-v2">
      {players.map((p, idx) => (
        <div key={p.id} className={`player-bar-item-v2${p.id === user.id ? ' me' : ''}${p.is_ready ? ' ready' : ''}`}>
          <div className="player-bar-name-v2">{p.id === user.id ? '你' : (p.phone ? `玩家${p.phone.slice(-4)}` : `玩家${idx + 1}`)}</div>
          <div className="player-bar-status-v2">{p.is_ready ? '已准备' : '理牌中...'}</div>
        </div>
      ))}
    </div>
  );

  // --- 卡牌点击/理牌 ---
  const handleCardClick = (card) => {
    const selected = selectedCards.some(c => areCardsEqual(c, card));
    setSelectedCards(selected ? selectedCards.filter(c => !areCardsEqual(c, card)) : [...selectedCards, card]);
  };
  const handleLaneClick = (lane) => {
    if (!selectedCards.length) return;
    let newTop = topLane.filter(c => !selectedCards.some(sel => areCardsEqual(sel, c)));
    let newMiddle = middleLane.filter(c => !selectedCards.some(sel => areCardsEqual(sel, c)));
    let newBottom = bottomLane.filter(c => !selectedCards.some(sel => areCardsEqual(sel, c)));
    if (lane === 'top') newTop = [...newTop, ...selectedCards];
    if (lane === 'middle') newMiddle = [...newMiddle, ...selectedCards];
    if (lane === 'bottom') newBottom = [...newBottom, ...selectedCards];
    setTopLane(newTop); setMiddleLane(newMiddle); setBottomLane(newBottom); setSelectedCards([]);
  };
  const handleAutoSort = () => {
    const hand = [...topLane, ...middleLane, ...bottomLane];
    const sorted = getSmartSortedHand(hand);
    if (sorted) {
      setTopLane(sorted.top); setMiddleLane(sorted.middle); setBottomLane(sorted.bottom);
      setSelectedCards([]);
    }
  };
  // --- 提交 ---
  const handleConfirm = async () => {
    if (isLoading || isReady) return;
    if (topLane.length !== LANE_LIMITS.top || middleLane.length !== LANE_LIMITS.middle || bottomLane.length !== LANE_LIMITS.bottom)
      return setErrorMessage('牌道数量错误！');
    setIsLoading(true);
    setErrorMessage('');
    try {
      const payload = { userId: user.id, roomId, hand: { top: topLane, middle: middleLane, bottom: bottomLane } };
      const resp = await fetch('/api/player_ready.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.success) setIsReady(true); else setErrorMessage(data.message || '提交失败');
    } catch {
      setErrorMessage('网络异常');
    } finally {
      setIsLoading(false);
    }
  };
  const handleCloseResult = () => { setGameResult(null); onBackToLobby(); };

  if (!hasDealt) {
    return (
      <div className="table-root pastel-bg">
        <div className="table-panel">
          <div className="table-top-bar-v2">
            <button onClick={onBackToLobby} className="table-quit-btn-v2">退出游戏</button>
            <div className="table-title-v2">十三张对局</div>
          </div>
          {renderPlayerBar()}
          <div className="waiting-text">等待所有玩家准备后开始游戏...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-root pastel-bg">
      <div className="table-panel">
        <div className="table-top-bar-v2">
          <button onClick={onBackToLobby} className="table-quit-btn-v2">退出游戏</button>
          <div className="table-title-v2">{gameMode === 'double' ? '十三张翻倍场' : '十三张普通场'}</div>
        </div>
        {renderPlayerBar()}
        <div className="lane-list-area-v2">
          <Lane title="头道" cards={topLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
          <Lane title="中道" cards={middleLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
          <Lane title="尾道" cards={bottomLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('bottom')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} />
        </div>
        <div className="footer-action-bar-v2">
          <button className="footer-btn-v2 orange" onClick={handleAutoSort} disabled={isReady}>自动理牌</button>
          <button className="footer-btn-v2 blue" onClick={handleConfirm} disabled={isLoading || isReady}>
            {isReady ? '等待其他玩家...' : (isLoading ? '提交中...' : '确认牌型')}
          </button>
        </div>
        {errorMessage && <div className="table-error">{errorMessage}</div>}
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default ThirteenGame;