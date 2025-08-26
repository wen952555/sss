import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './EightCardGame.css';
import { areCardsEqual, parseCard, sortCards } from '../utils';
import { dealOfflineEightCardGame, calculateEightCardTrialResult } from '../utils/offlineGameLogic';
import GameResultModal from './GameResultModal';

const EightCardGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd, isTrialMode = false }) => {
  const LANE_LIMITS = { middle: 8 };

  const [middleLane, setMiddleLane] = useState([]);
  const [aiHands, setAiHands] = useState([]);
  const [hasDealt, setHasDealt] = useState(false);
  const [hasSubmittedHand, setHasSubmittedHand] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Effect for online mode (currently not implemented for 8-card)
  useEffect(() => {
    if (isTrialMode) return;
    // Online logic would go here
  }, [roomId, user, hasDealt]);

  // Effect for trial mode setup
  useEffect(() => {
    if (!isTrialMode) return;

    const { playerHand, aiHands: initialAiHands } = dealOfflineEightCardGame(6);
    setMiddleLane(playerHand.map(parseCard));
    setAiHands(initialAiHands);
    setHasDealt(true);

    const allPlayers = [
      { id: user.id, phone: user.phone, is_ready: true },
      ...initialAiHands.map((_, index) => ({ id: `ai_${index}`, phone: `AI ${index + 1}`, is_ready: true }))
    ];
    setPlayers(allPlayers);
  }, [isTrialMode, user]);

  const handleConfirm = () => {
    if (isLoading || hasSubmittedHand) return;
    if (middleLane.length !== LANE_LIMITS.middle) {
      setErrorMessage(`牌道数量错误！`);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const middleLaneStrings = middleLane.map(c => `${c.rank}_of_${c.suit}`);
    const result = calculateEightCardTrialResult(middleLaneStrings, aiHands);

    const modalPlayers = [
      { name: user.phone, hand: { middle: middleLane }, score: result.playerScore, is_me: true },
      ...aiHands.map((hand, index) => ({
        name: `AI ${index + 1}`,
        hand: { middle: hand.map(parseCard) },
        score: 'N/A'
      }))
    ];
    const modalResult = { players: modalPlayers };
    setGameResult(modalResult);
    setHasSubmittedHand(true);
    setIsLoading(false);
  };

  const handleAutoSort = () => {
    // For 1-lane game, auto-sort just sorts by rank/suit for visual appeal.
    setMiddleLane(sortCards(middleLane));
  };

  const handleCloseResult = () => {
    setGameResult(null);
    onBackToLobby();
  };

  const renderPlayerName = (p) => {
    if (String(p.id).startsWith('ai')) return p.phone;
    if (p.id === user.id) return '你';
    return `玩家${p.phone.slice(-4)}`;
  };

  return (
    <div className="game-table-container">
      <div className="game-table-header">
        <button onClick={onBackToLobby} className="table-action-btn back-btn">&larr; 退出</button>
        <div className="game-table-title">急速八张 - 试玩模式</div>
      </div>
      <div className="players-status-container six-player">
        {players.map(p => (
          <div key={p.id} className={`player-status ${p.id === user.id ? 'is-me' : ''} ${p.is_ready ? 'is-ready' : ''}`}>
            <div className="player-avatar">{String(p.id).startsWith('ai') ? 'AI' : p.phone.slice(-2)}</div>
            <div className="player-info">
              <div className="player-name">{renderPlayerName(p)}</div>
              <div className="player-ready-text">{hasSubmittedHand ? '已提交' : '理牌中...'}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="lanes-container">
        <Lane title="牌" cards={middleLane} onCardClick={() => {}} selectedCards={[]} expectedCount={LANE_LIMITS.middle} />
      </div>

      {errorMessage && <p className="error-text">{errorMessage}</p>}
      <div className="game-table-footer">
          <>
            <button onClick={handleAutoSort} className="table-action-btn sort-btn" disabled={hasSubmittedHand}>自动理牌</button>
            <button onClick={handleConfirm} disabled={isLoading || hasSubmittedHand} className="table-action-btn confirm-btn">
              {hasSubmittedHand ? '等待开牌' : '确认'}
            </button>
          </>
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} gameType="eight" isTrial={true} />}
    </div>
  );
};

export default EightCardGame;