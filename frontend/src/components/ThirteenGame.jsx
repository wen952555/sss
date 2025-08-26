import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { getAiThirteenHand, calculateThirteenTrialResult, dealOfflineThirteenGame } from '../utils/offlineGameLogic';
import { parseCard } from '../utils';
import GameResultModal from './GameResultModal';

const ThirteenGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd, isTrialMode = false }) => {
  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [aiHands, setAiHands] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Effect for trial mode setup
  useEffect(() => {
    if (!isTrialMode) return;

    const { playerHand, aiHands: initialAiHands } = dealOfflineThirteenGame(4);

    // Auto-sort player's hand and set lanes directly
    const sortedPlayerHand = getAiThirteenHand(playerHand);
    if (sortedPlayerHand) {
        setTopLane(sortedPlayerHand.top.map(parseCard));
        setMiddleLane(sortedPlayerHand.middle.map(parseCard));
        setBottomLane(sortedPlayerHand.bottom.map(parseCard));
    }

    const sortedAiHands = initialAiHands.map(getAiThirteenHand);
    setAiHands(sortedAiHands);

    const allPlayers = [
        { id: user.id, phone: user.phone, is_ready: true },
        ...sortedAiHands.map((_, index) => ({ id: `ai_${index}`, phone: `AI ${index + 1}`, is_ready: true }))
    ];
    setPlayers(allPlayers);
    setIsReady(true); // Since it's auto-sorted, player is instantly "ready"
  }, [isTrialMode, user]);

  const handleConfirm = () => {
    if (isLoading || !isReady) return;

    setIsLoading(true);
    setErrorMessage('');

    const playerHandForScoring = {
      top: topLane.map(c => `${c.rank}_of_${c.suit}`),
      middle: middleLane.map(c => `${c.rank}_of_${c.suit}`),
      bottom: bottomLane.map(c => `${c.rank}_of_${c.suit}`)
    };
    const result = calculateThirteenTrialResult(playerHandForScoring, aiHands);

    const modalPlayers = [
      { name: user.phone, hand: playerHandForScoring, score: result.playerScore, is_me: true },
      ...aiHands.map((hand, index) => ({
        name: `AI ${index + 1}`,
        hand: hand,
        score: 'N/A'
      }))
    ];
    const modalResult = { players: modalPlayers };
    setGameResult(modalResult);
    setIsLoading(false);
  };

  const handleAutoSort = () => {
    // In trial mode, this button is visible but disabled.
    // In a real online game, this would trigger client-side sorting.
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

      <div className="lanes-container">
        <Lane title="头道" cards={topLane} onCardClick={null} selectedCards={[]} expectedCount={3} />
        <Lane title="中道" cards={middleLane} onCardClick={null} selectedCards={[]} expectedCount={5} />
        <Lane title="尾道" cards={bottomLane} onCardClick={null} selectedCards={[]} expectedCount={5} />
      </div>
      {errorMessage && <p className="error-text">{errorMessage}</p>}
      <div className="game-table-footer">
          <>
            <button onClick={handleAutoSort} className="table-action-btn sort-btn" disabled={isTrialMode || isReady}>自动理牌</button>
            <button onClick={handleConfirm} disabled={isLoading || isReady || gameResult} className="table-action-btn confirm-btn">
              {isReady ? '等待开牌' : '确认'}
            </button>
          </>
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} gameType="thirteen" isTrial={isTrialMode} />}
    </div>
  );
};

export default ThirteenGame;