import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './EightCardGame.css';
import { getSmartSortedHandForEight, areCardsEqual, parseCard } from '../utils';
import { dealOfflineEightCardGame, calculateEightCardTrialResult } from '../utils/offlineGameLogic';
import GameResultModal from './GameResultModal';

const EightCardGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd, isTrialMode = false }) => {
  const LANE_LIMITS = { top: 0, middle: 8, bottom: 0 };

  const [middleLane, setMiddleLane] = useState([]);
  const [aiHands, setAiHands] = useState([]); // For trial mode, array of hands
  const [selectedCards, setSelectedCards] = useState([]);
  const [hasDealt, setHasDealt] = useState(false);
  const [isReadyForDeal, setIsReadyForDeal] = useState(false);
  const [hasSubmittedHand, setHasSubmittedHand] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameStatus, setGameStatus] = useState('matching');
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Effect for online mode
  useEffect(() => {
    if (isTrialMode || gameStatus === 'finished') return;

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/index.php?action=game_status&roomId=${roomId}&userId=${user.id}`);
        const data = await response.json();
        if (data.success) {
          setGameStatus(data.gameStatus);
          setPlayers(data.players);
          const me = data.players.find(p => p.id === user.id);
          setIsReadyForDeal(me ? !!me.is_ready : false);
          if (data.hand && !hasDealt) {
            setMiddleLane(data.hand.middle);
            setHasDealt(true);
            setHasSubmittedHand(false);
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
  }, [roomId, user.id, gameStatus, hasDealt, isTrialMode]);

  // Effect for trial mode setup
  useEffect(() => {
    if (!isTrialMode) return;

    const { playerHand, aiHands } = dealOfflineEightCardGame(6);
    // Convert card strings to objects for rendering
    setMiddleLane(playerHand.map(parseCard));
    setAiHands(aiHands); // Keep AI hands as strings for the logic function
    setHasDealt(true);

    const allPlayers = [
      { id: user.id, phone: user.phone, is_ready: true },
      ...aiHands.map((_, index) => ({ id: `ai_${index}`, phone: `AI ${index + 1}`, is_ready: true }))
    ];
    setPlayers(allPlayers);
    setGameStatus('playing');
  }, [isTrialMode, user]);

  const handleReadyToggle = async () => {
    setIsLoading(true);
    setErrorMessage('');
    const action = isReadyForDeal ? 'unready' : 'ready';
    try {
      await fetch('/api/index.php?action=player_action', {
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
    if (isLoading || hasSubmittedHand) return;
    if (middleLane.length !== LANE_LIMITS.middle) {
      setErrorMessage(`牌道数量错误！`);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    if (isTrialMode) {
      // Convert card objects back to strings for the logic function
      const middleLaneStrings = middleLane.map(c => `${c.rank}_of_${c.suit}`);
      const result = calculateEightCardTrialResult(middleLaneStrings, aiHands);

      // Remap the result structure to what GameResultModal expects
      const modalPlayers = [
        { name: user.phone, hand: { middle: middleLane }, score: result.playerScore, is_me: true },
        ...result.aiHands.map((hand, index) => ({
          name: `AI ${index + 1}`,
          hand: { middle: hand.map(parseCard) },
          score: 'N/A' // Individual AI scores are not calculated, only player's total
        }))
      ];
      const modalResult = { players: modalPlayers };
      setGameResult(modalResult);
      setHasSubmittedHand(true);
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        userId: user.id,
        roomId: roomId,
        action: 'submit_hand',
        hand: { top: [], middle: middleLane, bottom: [] },
      };
      await fetch('/api/index.php?action=player_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setHasSubmittedHand(true);
    } catch (err) {
      setErrorMessage('与服务器通信失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = (cardToToggle) => {
    let newSelectedCards = [...selectedCards];
    let newMiddleLane = [...middleLane];
    const findAndRemove = (arr, card) => arr.filter(c => !areCardsEqual(c, card));
    if (newSelectedCards.some(c => areCardsEqual(c, cardToToggle))) {
      newSelectedCards = findAndRemove(newSelectedCards, cardToToggle);
      newMiddleLane.push(cardToToggle);
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

  const renderGameTitle = () => {
    if (isTrialMode) return '急速八张 - 试玩模式';
    return `急速八张 ${gameMode === 'special' ? '独头场' : '普通场'}`;
  };

  const renderPlayerName = (p) => {
    if (String(p.id).startsWith('ai')) return p.phone; // e.g., "AI 1"
    if (p.id === user.id) return '你';
    return `玩家${p.phone.slice(-4)}`;
  };

  return (
    <div className="game-table-container">
      <div className="game-table-header">
        <button onClick={onBackToLobby} className="table-action-btn back-btn">&larr; 退出</button>
        <div className="game-table-title">{renderGameTitle()}</div>
      </div>
      <div className="players-status-container six-player">
        {players.map(p => (
          <div key={p.id} className={`player-status ${p.id === user.id ? 'is-me' : ''} ${p.is_ready ? 'is-ready' : ''}`}>
            <div className="player-avatar">{String(p.id).startsWith('ai') ? 'AI' : p.phone.slice(-2)}</div>
            <div className="player-info">
              <div className="player-name">{renderPlayerName(p)}</div>
              <div className="player-ready-text">{hasDealt ? (hasSubmittedHand ? '已提交' : '理牌中...') : (p.is_ready ? '已准备' : '未准备')}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="lanes-container">
        {/* In trial mode, we deal instantly, so placeholder is less likely to show */}
        {!hasDealt && <div className="card-deck-placeholder">牌墩</div>}
        <Lane title="牌" cards={middleLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
      </div>
      {errorMessage && <p className="error-text">{errorMessage}</p>}
      <div className="game-table-footer">
        {isTrialMode || hasDealt ? (
          <>
            <button onClick={handleAutoSort} className="table-action-btn sort-btn" disabled={hasSubmittedHand}>自动理牌</button>
            <button onClick={handleConfirm} disabled={isLoading || hasSubmittedHand} className="table-action-btn confirm-btn">
              {hasSubmittedHand ? '等待开牌' : (isLoading ? '提交中...' : '确认')}
            </button>
          </>
        ) : (
          <button className="table-action-btn confirm-btn" onClick={handleReadyToggle} disabled={isLoading}>
            {isLoading ? '请稍候...' : (isReadyForDeal ? '取消准备' : '点击准备')}
          </button>
        )}
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} gameType="eight" isTrial={isTrialMode} />}
    </div>
  );
};

export default EightCardGame;