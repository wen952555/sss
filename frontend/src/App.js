// frontend_react/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import TopInfoBar from './components/TopInfoBar';
import HumanPlayerBoard from './components/HumanPlayerBoard';
import ActionButtons from './components/ActionButtons';
import ComparisonModal from './components/ComparisonModal';
// 从 gameLogic 导入的函数和常量
import {
  initialGameState,
  startGame as startGameLogic, // Renamed to avoid conflict if any local var is named startGame
  confirmArrangement as confirmPlayerArrangementLogic,
  compareAllHands as compareAllHandsLogic, // Renamed
  GameStates
} from './logic/gameLogic';
// 从 aiLogic 导入
import { arrangeCardsAI as arrangeCardsAILogic } from './logic/aiLogic'; // Renamed
// 从 cardUtils 导入的函数和常量
import {
  evaluateHand as evaluateHandLogic, // Renamed
  isValidArrangement as isValidArrangementLogic // Renamed
} from './logic/cardUtils';
import './App.css'; // 全局App样式

// eslint-disable-next-line no-unused-vars
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://wenge.cloudns.ch/api'
  : 'http://localhost:8000/api';

const GameStateDisplayNames = { // 用于TopInfoBar显示
  [GameStates.INIT]: "准备开始",
  [GameStates.DEALING]: "发牌中...",
  HUMAN_ARRANGING: "请您分牌", // 自定义状态名
  [GameStates.COMPARING]: "比牌中...",
  [GameStates.RESULTS]: "查看结果",
};

function App() {
  const [gameState, setGameState] = useState(initialGameState);
  const [arrangedHumanHand, setArrangedHumanHand] = useState({ tou: [], zhong: [], wei: [] });
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedCardFromHand, setSelectedCardFromHand] = useState(null);

  const humanPlayer = gameState.players.find(p => p.isHuman);

  const handleStartGame = useCallback(() => {
    setShowComparisonModal(false);
    setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    setSelectedCardFromHand(null);

    let newState = startGameLogic(initialGameState);

    newState.players = newState.players.map(player => {
      if (!player.isHuman) {
        const aiArrangement = arrangeCardsAILogic(player.hand);
        if (aiArrangement && isValidArrangementLogic(aiArrangement.tou, aiArrangement.zhong, aiArrangement.wei)) {
          const evalHands = {
            tou: evaluateHandLogic(aiArrangement.tou),
            zhong: evaluateHandLogic(aiArrangement.zhong),
            wei: evaluateHandLogic(aiArrangement.wei),
          };
          return { ...player, arranged: aiArrangement, evalHands, confirmed: true };
        } else {
          console.error(`AI ${player.name} failed to arrange cards or arranged invalidly.`);
           const fallbackTou = player.hand.slice(0,3);
           const fallbackZhong = player.hand.slice(3,8);
           const fallbackWei = player.hand.slice(8,13);

           if (fallbackTou.length === 3 && fallbackZhong.length === 5 && fallbackWei.length === 5 && isValidArrangementLogic(fallbackTou, fallbackZhong, fallbackWei)) {
             return {
                ...player,
                arranged: {tou: fallbackTou, zhong: fallbackZhong, wei: fallbackWei},
                evalHands: {
                    tou: evaluateHandLogic(fallbackTou),
                    zhong: evaluateHandLogic(fallbackZhong),
                    wei: evaluateHandLogic(fallbackWei),
                },
                confirmed: true
             }
           } else {
             return { ...player, arranged: {tou: [], zhong: [], wei: []}, evalHands: null, confirmed: true };
           }
        }
      }
      return player;
    });
    newState.gameState = "HUMAN_ARRANGING";
    setGameState(newState);
  }, []); // Imported functions are stable references

  const handleSubmitPlayerHand = useCallback(() => {
    if (!humanPlayer) return;

    const { tou, zhong, wei } = arrangedHumanHand;
    if (tou.length !== 3 || zhong.length !== 5 || wei.length !== 5) {
      alert("请将所有13张牌分入三墩！");
      return;
    }
    if (!isValidArrangementLogic(tou, zhong, wei)) {
      alert("您的墩牌不合法！请确保头道 ≤ 中道 ≤ 尾道。");
      return;
    }

    let stateAfterHumanConfirm = confirmPlayerArrangementLogic(gameState, humanPlayer.id, arrangedHumanHand);
    const finalStateWithResults = compareAllHandsLogic(stateAfterHumanConfirm);
    setGameState(finalStateWithResults);
    setShowComparisonModal(true);

  }, [humanPlayer, arrangedHumanHand, gameState]); // Imported functions are stable


  const handleAIHelperForHuman = useCallback(() => {
    if (humanPlayer && humanPlayer.hand.length === 13) {
      const suggestion = arrangeCardsAILogic(humanPlayer.hand);
      if (suggestion && isValidArrangementLogic(suggestion.tou, suggestion.zhong, suggestion.wei)) {
        setArrangedHumanHand(suggestion);
        setSelectedCardFromHand(null);
      } else {
        alert("AI未能给出有效的分牌建议。");
      }
    }
  }, [humanPlayer]); // Imported functions are stable


  const getUnassignedCards = useCallback(() => {
    if (!humanPlayer) return [];
    const assignedIds = new Set([
      ...arrangedHumanHand.tou.map(c => c.id),
      ...arrangedHumanHand.zhong.map(c => c.id),
      ...arrangedHumanHand.wei.map(c => c.id),
    ]);
    return (humanPlayer.hand || []).filter(card => !assignedIds.has(card.id));
  }, [humanPlayer, arrangedHumanHand]);

  const handleSelectCardFromPlayerHand = useCallback((card) => {
    setSelectedCardFromHand(prev => (prev && prev.id === card.id ? null : card));
  }, []);

  const handlePlaceCardInDun = useCallback((dunName) => {
    if (!selectedCardFromHand) return;

    setArrangedHumanHand(prevArrangement => {
      const newArrangement = { ...prevArrangement };
      Object.keys(newArrangement).forEach(key => {
          newArrangement[key] = (newArrangement[key] || []).filter(c => c.id !== selectedCardFromHand.id);
      });

      const dun = [...(newArrangement[dunName] || [])];
      const dunMaxSize = dunName === 'tou' ? 3 : 5;

      if (dun.length < dunMaxSize) {
        newArrangement[dunName] = [...dun, selectedCardFromHand];
        setSelectedCardFromHand(null);
      } else {
        alert(`${dunName.toUpperCase()}道已满！`);
      }
      return newArrangement;
    });
  }, [selectedCardFromHand]);

  const handleRemoveCardFromDun = useCallback((card, dunName) => {
    setArrangedHumanHand(prevArrangement => {
      const newArrangement = { ...prevArrangement };
      newArrangement[dunName] = (newArrangement[dunName] || []).filter(c => c.id !== card.id);
      return newArrangement;
    });
    if (selectedCardFromHand && selectedCardFromHand.id === card.id) {
        setSelectedCardFromHand(null);
    }
  }, [selectedCardFromHand]);

  // AI auto-arranges and confirms (no specific useEffect for this as it's part of handleStartGame)
  // useEffect for AI would typically be:
  // }, [gameState.gameState, gameState.players]); // This was the previous one, now handled differently

  // Check if all players confirmed (AI auto-confirms, human confirms via button)
  useEffect(() => {
    if (gameState.gameState === "HUMAN_ARRANGING") { // After human player is supposed to arrange
        // This useEffect is more for future, if we need to check all confirmed.
        // For now, AI is confirmed in handleStartGame, human confirms on submit.
        // So this might not be strictly needed for the current simplified flow.
    }
  }, [gameState.gameState, gameState.players]);


  // Compare hands when game state is COMPARING (set after human submits)
  // This logic is now part of handleSubmitPlayerHand, so this useEffect might be redundant
  // or could be used if COMPARING was a separate state before RESULTS.
  // useEffect(() => {
  //   if (gameState.gameState === GameStates.COMPARING) { // Assuming COMPARING is set
  //     const finalStateWithResults = compareAllHandsLogic(gameState);
  //     setGameState(finalStateWithResults);
  //     setShowComparisonModal(true);
  //   }
  // }, [gameState.gameState, gameState]); // compareAllHandsLogic is stable

  useEffect(() => {
    if (gameState.gameState === GameStates.INIT) {
      // Check if it's not already in the process of starting to avoid loops if handleStartGame itself sets to INIT.
      // This simple check might not be enough for all race conditions.
      // A more robust way would be a flag like isStartingGame.
      // For now, assuming handleStartGame changes state away from INIT quickly.
      if (!gameState.players.some(p => p.hand.length > 0)) { // Only start if no hands dealt
         handleStartGame();
      }
    }
  }, [gameState.gameState, gameState.players, handleStartGame]); // Added handleStartGame to deps


  if (gameState.gameState === GameStates.INIT && !gameState.players.find(p=>p.isHuman)?.hand.length) {
    return <div className="app-loading">正在准备新一局...</div>;
  }


  const currentStatusText = GameStateDisplayNames[gameState.gameState] || "进行中...";
  const playerNames = gameState.players.map(p => p.name).join('、');

  return (
    <div className="app-container">
      {!showComparisonModal && humanPlayer && (
        <>
          <TopInfoBar statusText={currentStatusText} playerNames={playerNames} />
          <div className="game-content-area">
            <HumanPlayerBoard
              player={humanPlayer}
              unassignedCards={getUnassignedCards()}
              arrangedHand={arrangedHumanHand}
              selectedCardId={selectedCardFromHand?.id}
              onSelectCardFromHand={handleSelectCardFromPlayerHand}
              onPlaceCardInDun={handlePlaceCardInDun}
              onRemoveCardFromDun={handleRemoveCardFromDun}
            />
          </div>
          <ActionButtons
            onAIHelper={handleAIHelperForHuman}
            onSubmit={handleSubmitPlayerHand}
            canSubmit={
                arrangedHumanHand.tou.length === 3 &&
                arrangedHumanHand.zhong.length === 5 &&
                arrangedHumanHand.wei.length === 5
            }
          />
        </>
      )}

      {showComparisonModal && gameState.roundResults && (
        <ComparisonModal
          results={gameState.roundResults}
          players={gameState.players}
          onClose={() => {
            setShowComparisonModal(false);
            // Reset to INIT state to trigger useEffect for a new game, preserving scores.
            setGameState(prev => ({
                ...initialGameState, // Reset deck, hands, arrangements, etc.
                players: prev.players.map(p => ({ // Keep player names and scores
                    ...initialGameState.players.find(ip => ip.id === p.id), // Get fresh structure
                    id: p.id,
                    name: p.name,
                    isHuman: p.isHuman,
                    score: p.score, // Preserve score
                    hand: [], // Reset hand
                    arranged: { tou: [], zhong: [], wei: [] },
                    evalHands: null,
                    confirmed: false,
                 })),
                gameState: GameStates.INIT
            }));
          }}
        />
      )}
    </div>
  );
}

export default App;
