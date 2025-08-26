import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { useCardArrangement } from '../hooks/useCardArrangement';
import { dealOfflineThirteenGame, getAiThirteenHand, calculateThirteenTrialResult } from '../utils/offlineGameLogic';
import GameResultModal from './GameResultModal';

const ThirteenGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd, isTrialMode = false }) => {
  const [initialHand, setInitialHand] = useState([]);
  const {
    topLane,
    middleLane,
    bottomLane,
    unassignedCards,
    selectedCards,
    handleCardClick,
    handleLaneClick,
    handleAutoSort
  } = useCardArrangement(initialHand, 'thirteen');

  const [aiHands, setAiHands] = useState([]);
  const [hasDealt, setHasDealt] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Effect for online mode (simplified)
  useEffect(() => {
    if (isTrialMode) return;
    // Online logic would fetch the hand and setInitialHand(data.hand)
  }, [roomId, user, isTrialMode]);

  // Effect for trial mode setup
  useEffect(() => {
    if (!isTrialMode) return;

    const { playerHand, aiHands: initialAiHands } = dealOfflineThirteenGame(4);
    setInitialHand(playerHand);
    const sortedAiHands = initialAiHands.map(getAiThirteenHand);
    setAiHands(sortedAiHands);

    setHasDealt(true);
    const allPlayers = [
        { id: user.id, phone: user.phone, is_ready: true },
        ...sortedAiHands.map((_, index) => ({ id: `ai_${index}`, phone: `AI ${index + 1}`, is_ready: true }))
    ];
    setPlayers(allPlayers);
  }, [isTrialMode, user]);

  const handleConfirm = async () => {
    if (isLoading || isReady) return;
    const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };
    if (topLane.length !== LANE_LIMITS.top || middleLane.length !== LANE_LIMITS.middle || bottomLane.length !== LANE_LIMITS.bottom) {
      setErrorMessage(`牌道数量错误！`);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    if (isTrialMode) {
      const playerHand = {
        top: topLane.map(c => `${c.rank}_of_${c.suit}`),
        middle: middleLane.map(c => `${c.rank}_of_${c.suit}`),
        bottom: bottomLane.map(c => `${c.rank}_of_${c.suit}`)
      };
      const result = calculateThirteenTrialResult(playerHand, aiHands);

      const modalPlayers = [
        { name: user.phone, hand: playerHand, score: result.playerScore, is_me: true },
        ...aiHands.map((hand, index) => ({
          name: `AI ${index + 1}`,
          hand: hand,
          score: 'N/A'
        }))
      ];
      const modalResult = { players: modalPlayers };
      setGameResult(modalResult);
      setIsReady(true);
    }
    // Online logic would go here
    setIsLoading(false);
  };

  const handleCloseResult = () => {
    setGameResult(null);
    onBackToLobby();
  };

  const renderPlayerName = (p) => {
    if (String(p.id).startsWith('ai')) return p.phone;
    if (!p.id || !user || p.id === user.id) return '你';
    return `玩家${p.phone.slice(-4)}`;
  };

  return (
    <div className="game-table-container sss-game-container">
      <div className="game-table-header">
        <button onClick={onBackToLobby} className="table-action-btn back-btn">&larr; 退出</button>
        <div className="game-table-title">{isTrialMode ? '十三张 - 试玩模式' : `十三张 ${gameMode === 'double' ? '翻倍场' : '普通场'}`}</div>
      </div>
      <div className="players-status-container">
        {players.map(p => (
          <div key={p.id} className={`player-status ${p.id === user.id ? 'is-me' : ''} ${isReady ? 'is-ready' : ''}`}>
            <div className="player-avatar">{String(p.id).startsWith('ai') ? 'AI' : p.phone.slice(-2)}</div>
            <div className="player-info">
              <div className="player-name">{renderPlayerName(p)}</div>
              <div className="player-ready-text">{isReady ? '已提交' : '理牌中...'}</div>
            </div>
          </div>
        ))}
      </div>

      {unassignedCards.length > 0 && (
          <Lane title="待选牌" cards={unassignedCards} onCardClick={(card) => handleCardClick(card, 'unassigned')} selectedCards={selectedCards} />
      )}

      <div className="lanes-container">
        <Lane title="头道" cards={topLane} onCardClick={(card) => handleCardClick(card, 'lane', 'top')} onLaneClick={() => handleLaneClick('top')} selectedCards={selectedCards} expectedCount={3} />
        <Lane title="中道" cards={middleLane} onCardClick={(card) => handleCardClick(card, 'lane', 'middle')} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={5} />
        <Lane title="尾道" cards={bottomLane} onCardClick={(card) => handleCardClick(card, 'lane', 'bottom')} onLaneClick={() => handleLaneClick('bottom')} selectedCards={selectedCards} expectedCount={5} />
      </div>
      {errorMessage && <p className="error-text">{errorMessage}</p>}
      <div className="game-table-footer">
          <>
            <button onClick={handleAutoSort} className="table-action-btn sort-btn" disabled={isReady}>自动理牌</button>
            <button onClick={handleConfirm} disabled={isLoading || isReady} className="table-action-btn confirm-btn">
              {isReady ? '等待开牌' : '确认'}
            </button>
          </>
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} gameType="thirteen" isTrial={isTrialMode} />}
    </div>
  );
};

export default ThirteenGame;