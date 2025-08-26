import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './EightCardGame.css';
import { useCardArrangement } from '../hooks/useCardArrangement';
import { dealOfflineEightCardGame, calculateEightCardTrialResult } from '../utils/offlineGameLogic';
import { getSmartSortedHandForEight } from '../utils/eightCardAutoSorter';
import GameResultModal from './GameResultModal';

const EightCardGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd, isTrialMode = false }) => {
  const [initialHand, setInitialHand] = useState([]);
  const {
    topLane,
    middleLane,
    unassignedCards,
    selectedCards,
    handleCardClick,
    handleLaneClick,
    handleAutoSort
  } = useCardArrangement(initialHand, 'eight');

  const [aiHands, setAiHands] = useState([]);
  const [hasDealt, setHasDealt] = useState(false);
  const [hasSubmittedHand, setHasSubmittedHand] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Effect for trial mode setup
  useEffect(() => {
    if (!isTrialMode) return;

    const { playerHand, aiHands: initialAiHands } = dealOfflineEightCardGame(6);
    setInitialHand(playerHand);

    const processedAiHands = initialAiHands.map(hand => getSmartSortedHandForEight(hand));
    setAiHands(processedAiHands);
    setHasDealt(true);

    const allPlayers = [
      { id: user.id, phone: user.phone, is_ready: true },
      ...initialAiHands.map((_, index) => ({ id: `ai_${index}`, phone: `AI ${index + 1}`, is_ready: true }))
    ];
    setPlayers(allPlayers);
  }, [isTrialMode, user]);

  const handleConfirm = () => {
    if (isLoading || hasSubmittedHand) return;
    const LANE_LIMITS = { top: 3, middle: 5 };
    if (topLane.length !== LANE_LIMITS.top || middleLane.length !== LANE_LIMITS.middle) {
      setErrorMessage(`牌道数量错误！`);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const playerHand = {
      top: topLane.map(c => `${c.rank}_of_${c.suit}`),
      middle: middleLane.map(c => `${c.rank}_of_${c.suit}`),
    };
    const result = calculateEightCardTrialResult(playerHand, aiHands);

    const modalPlayers = [
      { name: user.phone, hand: { ...playerHand, bottom: [] }, score: result.playerScore, is_me: true },
      ...aiHands.map((hand, index) => ({
        name: `AI ${index + 1}`,
        hand: { ...hand, bottom: [] },
        score: 'N/A'
      }))
    ];
    const modalResult = { players: modalPlayers };
    setGameResult(modalResult);
    setHasSubmittedHand(true);
    setIsLoading(false);
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
          <div key={p.id} className={`player-status ${p.id === user.id ? 'is-me' : ''}`}>
            <div className="player-avatar">{String(p.id).startsWith('ai') ? 'AI' : p.phone.slice(-2)}</div>
            <div className="player-info">
              <div className="player-name">{renderPlayerName(p)}</div>
              <div className="player-ready-text">{hasSubmittedHand ? '已提交' : '理牌中...'}</div>
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
        <Lane title="尾道" cards={[]} onLaneClick={null} selectedCards={[]} expectedCount={0} isDisabled={true} />
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