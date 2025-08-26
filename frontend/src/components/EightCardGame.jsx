import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './EightCardGame.css';
import { getSmartSortedHandForEight, areCardsEqual, parseCard, sortCards } from '../utils';
import { dealOfflineEightCardGame, calculateEightCardTrialResult, getAiThirteenHand } from '../utils/offlineGameLogic'; // We can reuse the 13-card AI logic
import GameResultModal from './GameResultModal';

const EightCardGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd, isTrialMode = false }) => {
  const LANE_LIMITS = { top: 3, middle: 5, bottom: 0 };

  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [unassignedCards, setUnassignedCards] = useState([]);
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

  // This logic is now similar to ThirteenGame
  // Effect for online mode
  useEffect(() => {
    if (isTrialMode || gameStatus === 'finished') return;
    // Online logic for 8-card game would go here if it existed.
    // For now, it's trial-only.
  }, [roomId, user.id, gameStatus, hasDealt, isTrialMode]);

  // Effect for trial mode setup
  useEffect(() => {
    if (!isTrialMode) return;

    const { playerHand, aiHands: initialAiHands } = dealOfflineEightCardGame(6);
    setUnassignedCards(playerHand.map(parseCard));

    // For 8-card game, AI also needs to arrange hand into 3-5
    const processedAiHands = initialAiHands.map(hand => {
        // This is a placeholder for 8-card AI logic. We'll reuse 13-card logic for now.
        // A proper implementation would need a dedicated 8-card auto-sorter.
        const sorted = getSmartSortedHandForEight(hand);
        return sorted;
    });

    setAiHands(processedAiHands);
    setHasDealt(true);

    const allPlayers = [
      { id: user.id, phone: user.phone, is_ready: true },
      ...initialAiHands.map((_, index) => ({ id: `ai_${index}`, phone: `AI ${index + 1}`, is_ready: true }))
    ];
    setPlayers(allPlayers);
    setGameStatus('playing');
  }, [isTrialMode, user]);

  const handleConfirm = async () => {
    if (isLoading || hasSubmittedHand) return;
    if (topLane.length !== LANE_LIMITS.top || middleLane.length !== LANE_LIMITS.middle) {
      setErrorMessage(`牌道数量错误！`);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    // NOTE: Scoring logic will need to be updated for 3-5-0 structure
    // This part is complex and will be handled in the logic file update.
    setHasSubmittedHand(true);
    setIsLoading(false);
  };

  const handleCardClick = (card, source, sourceLaneName = null) => {
    const cardIsSelected = selectedCards.some(c => areCardsEqual(c, card));
    let newSelectedCards = [...selectedCards];
    let newUnassigned = [...unassignedCards];
    let newTop = [...topLane];
    let newMiddle = [...middleLane];
    const laneMap = { top: newTop, middle: newMiddle };
    if (cardIsSelected) {
      newSelectedCards = newSelectedCards.filter(c => !areCardsEqual(c, card));
      if (source === 'unassigned') newUnassigned.push(card);
      else if (sourceLaneName) laneMap[sourceLaneName].push(card);
    } else {
      newSelectedCards.push(card);
      if (source === 'unassigned') newUnassigned = newUnassigned.filter(c => !areCardsEqual(c, card));
      else if (sourceLaneName) laneMap[sourceLaneName] = laneMap[sourceLaneName].filter(c => !areCardsEqual(c, card));
    }
    setSelectedCards(newSelectedCards);
    setUnassignedCards(sortCards(newUnassigned));
    setTopLane(sortCards(newTop));
    setMiddleLane(sortCards(newMiddle));
  };

  const handleLaneClick = (laneName) => {
    if (selectedCards.length === 0 || laneName === 'bottom') return;
    const laneSetters = { top: setTopLane, middle: setMiddleLane };
    const lanes = { top: topLane, middle: middleLane };
    const targetLane = lanes[laneName];
    const setter = laneSetters[laneName];
    const limit = LANE_LIMITS[laneName];
    if (targetLane.length + selectedCards.length > limit) {
      setErrorMessage(`此道最多只能放 ${limit} 张牌!`);
      return;
    }
    setter(sortCards([...targetLane, ...selectedCards]));
    setSelectedCards([]);
    setUnassignedCards(unassignedCards.filter(c => !selectedCards.some(sc => areCardsEqual(c, sc))));
  };

  const handleAutoSort = () => {
    if (!hasDealt) return;
    const sorted = getSmartSortedHandForEight(unassignedCards);
    if (sorted) {
      setTopLane(sorted.top);
      setMiddleLane(sorted.middle);
      setUnassignedCards([]);
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
              <div className="player-ready-text">{hasDealt ? (hasSubmittedHand ? '已提交' : '理牌中...') : '未准备'}</div>
            </div>
          </div>
        ))}
      </div>

      {isTrialMode && unassignedCards.length > 0 && (
          <Lane title="待选牌" cards={unassignedCards} onCardClick={(card) => handleCardClick(card, 'unassigned')} selectedCards={selectedCards} />
      )}

      <div className="lanes-container">
        <Lane title="头道" cards={topLane} onCardClick={(card) => handleCardClick(card, 'lane', 'top')} onLaneClick={() => handleLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
        <Lane title="中道" cards={middleLane} onCardClick={(card) => handleCardClick(card, 'lane', 'middle')} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
        <Lane title="尾道" cards={[]} onLaneClick={null} selectedCards={[]} expectedCount={LANE_LIMITS.bottom} isDisabled={true} />
      </div>

      {errorMessage && <p className="error-text">{errorMessage}</p>}
      <div className="game-table-footer">
          <>
            <button onClick={handleAutoSort} className="table-action-btn sort-btn" disabled={hasSubmittedHand}>自动理牌</button>
            <button onClick={handleConfirm} disabled={isLoading || hasSubmittedHand} className="table-action-btn confirm-btn">
              {hasSubmittedHand ? '等待开牌' : (isLoading ? '提交中...' : '确认')}
            </button>
          </>
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} gameType="eight" isTrial={isTrialMode} />}
    </div>
  );
};

export default EightCardGame;