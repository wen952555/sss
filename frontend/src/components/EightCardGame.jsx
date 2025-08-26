import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './EightCardGame.css';
import { areCardsEqual, parseCard, sortCards, getSmartSortedHandForEight, calculateEightCardTrialResult, dealOfflineEightCardGame } from '../utils';
import GameResultModal from './GameResultModal';

const EightCardGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd, isTrialMode = false }) => {
  const LANE_LIMITS = { top: 2, middle: 3, bottom: 3 };

  // All state is now local to the component
  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [unassignedCards, setUnassignedCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);

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
    setUnassignedCards(playerHand.map(parseCard));

    const processedAiHands = initialAiHands.map(hand => getSmartSortedHandForEight(hand));
    setAiHands(processedAiHands);
    setHasDealt(true);

    const allPlayers = [
      { id: user.id, phone: user.phone, is_ready: true },
      ...initialAiHands.map((_, index) => ({ id: `ai_${index}`, phone: `AI ${index + 1}`, is_ready: true }))
    ];
    setPlayers(allPlayers);
  }, [isTrialMode, user]);

  const handleCardClick = (card) => {
    setSelectedCards(prevSelected => {
      const isSelected = prevSelected.some(c => areCardsEqual(c, card));
      if (isSelected) {
        return prevSelected.filter(c => !areCardsEqual(c, card));
      } else {
        return [...prevSelected, card];
      }
    });
  };

  const handleLaneClick = (laneName) => {
    if (selectedCards.length === 0) return;

    const laneSetterMap = { top: setTopLane, middle: setMiddleLane, bottom: setBottomLane };
    const currentLanes = { top: topLane, middle: middleLane, bottom: bottomLane };
    const targetSetter = laneSetterMap[laneName];

    if (currentLanes[laneName].length + selectedCards.length > LANE_LIMITS[laneName]) {
      setErrorMessage(`此道最多只能放 ${LANE_LIMITS[laneName]} 张牌!`);
      return;
    }

    targetSetter(prevLane => sortCards([...prevLane, ...selectedCards]));

    setUnassignedCards(prev => prev.filter(c => !selectedCards.some(sc => areCardsEqual(c, sc))));
    setTopLane(prev => (laneName === 'top' ? prev : prev.filter(c => !selectedCards.some(sc => areCardsEqual(c, sc)))));
    setMiddleLane(prev => (laneName === 'middle' ? prev : prev.filter(c => !selectedCards.some(sc => areCardsEqual(c, sc)))));
    setBottomLane(prev => (laneName === 'bottom' ? prev : prev.filter(c => !selectedCards.some(sc => areCardsEqual(c, sc)))));

    setSelectedCards([]);
  };

  const handleAutoSort = () => {
    if (!hasDealt || hasSubmittedHand) return;
    const sorted = getSmartSortedHandForEight(unassignedCards);
    if (sorted) {
      setTopLane(sorted.top);
      setMiddleLane(sorted.middle);
      setBottomLane(sorted.bottom);
      setUnassignedCards([]);
    }
  };

  const handleConfirm = () => {
    if (isLoading || hasSubmittedHand) return;
    if (topLane.length !== LANE_LIMITS.top || middleLane.length !== LANE_LIMITS.middle || bottomLane.length !== LANE_LIMITS.bottom) {
      setErrorMessage(`牌道数量错误！`);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const playerHand = {
      top: topLane.map(c => `${c.rank}_of_${c.suit}`),
      middle: middleLane.map(c => `${c.rank}_of_${c.suit}`),
      bottom: bottomLane.map(c => `${c.rank}_of_${c.suit}`),
    };
    const result = calculateEightCardTrialResult(playerHand, aiHands);

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
          <Lane title="待选牌" cards={unassignedCards} onCardClick={handleCardClick} selectedCards={selectedCards} />
      )}

      <div className="lanes-container">
        <Lane title="头道" cards={topLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
        <Lane title="中道" cards={middleLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
        <Lane title="尾道" cards={bottomLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('bottom')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} />
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