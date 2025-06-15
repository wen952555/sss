// frontend_react/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import TopInfoBar from './components/TopInfoBar';
import HumanPlayerBoard from './components/HumanPlayerBoard';
import ActionButtons from './components/ActionButtons';
import ComparisonModal from './components/ComparisonModal';
import {
  initialGameState,
  startGame as startGameLogic,
  confirmArrangement as confirmPlayerArrangementLogic,
  compareAllHands as compareAllHandsLogic,
  GameStates
} from './logic/gameLogic';
import { arrangeCardsAI as arrangeCardsAILogic } from './logic/aiLogic';
import {
  evaluateHand as evaluateHandLogic,
  isValidArrangement as isValidArrangementLogic
} from './logic/cardUtils';
import './App.css';

// eslint-disable-next-line no-unused-vars
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://wenge.cloudns.ch/api'
  : 'http://localhost:8000/api';

const GameStateDisplayNames = {
  [GameStates.INIT]: "正在准备游戏...",
  HUMAN_ARRANGING: "请您调整牌型",
  [GameStates.RESULTS]: "查看结果", // This state is when modal is shown
};

function App() {
  const [gameState, setGameState] = useState(initialGameState);
  const [arrangedHumanHand, setArrangedHumanHand] = useState({ tou: [], zhong: [], wei: [] });
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedCardsInfo, setSelectedCardsInfo] = useState([]);
  const [isLoadingNewGame, setIsLoadingNewGame] = useState(false); // New state for loading

  const humanPlayerFromState = gameState.players.find(p => p.isHuman);

  const initializeNewGame = useCallback(() => {
    // This function is now called after isLoadingNewGame is set to true
    console.time("initializeNewGameTotal");
    // setShowComparisonModal(false); // Modal is already closed by handleCloseComparisonModal
    setSelectedCardsInfo([]);
    setArrangedHumanHand({ tou: [], zhong: [], wei: [] });

    console.time("startGameLogic");
    let newState = startGameLogic(initialGameState);
    console.timeEnd("startGameLogic");

    let humanHandForAISuggestion = [];
    console.time("aiAndHumanSetup");
    newState.players = newState.players.map(player => {
      if (!player.isHuman) {
        console.time(`aiArrange-${player.id}`);
        const aiArrangement = arrangeCardsAILogic(player.hand);
        console.timeEnd(`aiArrange-${player.id}`);
        if (aiArrangement && isValidArrangementLogic(aiArrangement.tou, aiArrangement.zhong, aiArrangement.wei)) {
          const evalHands = { /* ... */ }; // evaluateHandLogic for each dun
          return { ...player, arranged: aiArrangement, evalHands: {tou: evaluateHandLogic(aiArrangement.tou), zhong: evaluateHandLogic(aiArrangement.zhong), wei: evaluateHandLogic(aiArrangement.wei)}, confirmed: true };
        } else { /* AI fallback */ 
            const fallbackTou = player.hand.slice(0,3);
            const fallbackZhong = player.hand.slice(3,8);
            const fallbackWei = player.hand.slice(8,13);
            const emptyArr = {tou: [], zhong: [], wei: []};
            const fbEval = {tou: evaluateHandLogic(fallbackTou), zhong: evaluateHandLogic(fallbackZhong), wei: evaluateHandLogic(fallbackWei)};
            const emptyEval = {tou: evaluateHandLogic([]), zhong: evaluateHandLogic([]), wei: evaluateHandLogic([])};
            if(fallbackTou.length === 3 && fallbackZhong.length === 5 && fallbackWei.length === 5 && isValidArrangementLogic(fallbackTou, fallbackZhong, fallbackWei)) {
                return { ...player, arranged: {tou: fallbackTou, zhong: fallbackZhong, wei: fallbackWei}, evalHands: fbEval, confirmed: true };
            }
            return { ...player, arranged: emptyArr, evalHands: emptyEval, confirmed: true };
        }
      } else {
        humanHandForAISuggestion = [...player.hand];
        return player;
      }
    });

    if (humanHandForAISuggestion.length === 13) {
      console.time("humanInitialAIArrange");
      const initialHumanAIArrangement = arrangeCardsAILogic(humanHandForAISuggestion);
      console.timeEnd("humanInitialAIArrange");
      if (initialHumanAIArrangement && isValidArrangementLogic(initialHumanAIArrangement.tou, initialHumanAIArrangement.zhong, initialHumanAIArrangement.wei)) {
        setArrangedHumanHand(initialHumanAIArrangement);
      } else {
        setArrangedHumanHand({ tou: humanHandForAISuggestion.slice(0,3), zhong: humanHandForAISuggestion.slice(3,8), wei: humanHandForAISuggestion.slice(8,13) });
      }
    } else {
      setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    }
    console.timeEnd("aiAndHumanSetup");

    newState.gameState = "HUMAN_ARRANGING";
    console.time("setInitialGameState");
    setGameState(newState);
    console.timeEnd("setInitialGameState");
    
    setIsLoadingNewGame(false); // Reset loading state
    console.timeEnd("initializeNewGameTotal");
  }, []); // Dependencies are stable

  // Handles closing the modal and then triggering the new game initialization
  const handleCloseComparisonModalAndStartNewGame = useCallback(() => {
    setShowComparisonModal(false);
    setIsLoadingNewGame(true); // Set loading state

    // Use setTimeout to allow the UI to update and show the loading state
    // before the potentially blocking initializeNewGame function runs.
    setTimeout(() => {
      initializeNewGame();
    }, 50); // Small delay, e.g., 50ms
  }, [initializeNewGame]);


  useEffect(() => {
    // Only initialize if game is INIT and not already loading a new game
    if (gameState.gameState === GameStates.INIT && !isLoadingNewGame) {
        // Check if it's a genuine new game start or after a modal close
        // This ensures initializeNewGame is called once when app loads with INIT state
        // or when explicitly reset to INIT for a new game.
        const humanP = gameState.players.find(p=>p.isHuman);
        if (!humanP || !humanP.hand || humanP.hand.length === 0) {
             setIsLoadingNewGame(true); // Set loading before first init
             setTimeout(() => initializeNewGame(), 50);
        }
    }
  }, [gameState.gameState, isLoadingNewGame, initializeNewGame, gameState.players]);


  const handleSubmitPlayerHand = useCallback(() => { /* ... (no changes needed here) ... */ 
    if (!humanPlayerFromState) return;
    const { tou, zhong, wei } = arrangedHumanHand;
    const totalCardsInDuns = tou.length + zhong.length + wei.length;
    if (totalCardsInDuns !== 13) { alert(`总牌数必须是13张，当前为 ${totalCardsInDuns} 张。请检查各墩牌数。`); return; }
    if (tou.length !== 3 || zhong.length !== 5 || wei.length !== 5) { alert(`墩牌数量不正确！\n头道需3张 (当前${tou.length}张)\n中道需5张 (当前${zhong.length}张)\n尾道需5张 (当前${wei.length}张)`); return; }
    if (!isValidArrangementLogic(tou, zhong, wei)) { alert("您的墩牌不合法！请确保头道 ≤ 中道 ≤ 尾道。"); return; }

    let stateAfterHumanConfirm = confirmPlayerArrangementLogic(gameState, humanPlayerFromState.id, arrangedHumanHand);
    const finalStateWithResults = compareAllHandsLogic(stateAfterHumanConfirm);
    setGameState(finalStateWithResults); // This also changes gameState.gameState to RESULTS
    setShowComparisonModal(true);
  }, [humanPlayerFromState, arrangedHumanHand, gameState]);

  const handleAIHelperForHuman = useCallback(() => { /* ... (no changes needed here) ... */ 
    const humanP = gameState.players.find(p => p.isHuman);
    if (humanP && humanP.hand && humanP.hand.length === 13) {
      const suggestion = arrangeCardsAILogic(humanP.hand);
      if (suggestion && isValidArrangementLogic(suggestion.tou, suggestion.zhong, suggestion.wei)) {
        setArrangedHumanHand(suggestion);
        setSelectedCardsInfo([]);
      } else {
        alert("AI未能给出新的有效分牌建议。");
      }
    }
  }, [gameState.players]);

  const handleCardClick = useCallback((cardClicked, currentDunOfCard) => { /* ... (no changes) ... */ 
    setSelectedCardsInfo(prevSelected => {
      const existingIndex = prevSelected.findIndex(info => info.card.id === cardClicked.id);
      if (existingIndex > -1) {
        return prevSelected.filter((_, index) => index !== existingIndex);
      } else {
        return [...prevSelected, { card: cardClicked, fromDun: currentDunOfCard }];
      }
    });
  }, []);

  const handleDunClick = useCallback((targetDunName) => { /* ... (no changes) ... */ 
    if (selectedCardsInfo.length > 0) {
      setArrangedHumanHand(prevArrangement => {
        const newArrangement = { tou: [...prevArrangement.tou], zhong: [...prevArrangement.zhong], wei: [...prevArrangement.wei]};
        const cardsToAddToTarget = [];
        selectedCardsInfo.forEach(selectedInfo => {
          const { card, fromDun } = selectedInfo;
          if (fromDun && newArrangement[fromDun]) {
            newArrangement[fromDun] = newArrangement[fromDun].filter(c => c.id !== card.id);
          }
          cardsToAddToTarget.push(card);
        });
        const existingTargetDunCardIds = new Set(newArrangement[targetDunName].map(c=>c.id));
        const uniqueCardsToAdd = cardsToAddToTarget.filter(c => !existingTargetDunCardIds.has(c.id));
        newArrangement[targetDunName] = [...newArrangement[targetDunName], ...uniqueCardsToAdd];
        return newArrangement;
      });
      setSelectedCardsInfo([]);
    }
  }, [selectedCardsInfo]);


  if (isLoadingNewGame || (gameState.gameState === GameStates.INIT && !humanPlayerFromState?.hand?.length)) {
     return <div className="app-loading">请稍候，正在准备新一局...</div>;
  }

  const currentStatusText = GameStateDisplayNames[gameState.gameState] || "进行中...";
  const playerNames = gameState.players.map(p => p.name).join('、');

  return (
    <div className="app-container">
      {!showComparisonModal && humanPlayerFromState && (
        <>
          <TopInfoBar statusText={currentStatusText} playerNames={playerNames} />
          <div className="game-content-area">
            <HumanPlayerBoard
              arrangedHand={arrangedHumanHand}
              selectedCardsInfo={selectedCardsInfo}
              onCardClick={handleCardClick}
              onDunClick={handleDunClick}
            />
          </div>
          <ActionButtons
            onAIHelper={handleAIHelperForHuman}
            onSubmit={handleSubmitPlayerHand}
            canSubmit={
                (arrangedHumanHand.tou.length + arrangedHumanHand.zhong.length + arrangedHumanHand.wei.length) === 13
            }
          />
        </>
      )}

      {showComparisonModal && (
        <ComparisonModal
          players={gameState.players}
          onClose={handleCloseComparisonModalAndStartNewGame} // Use the new handler
          // isLoadingNewGame can be passed to ComparisonModal if button is inside it
        />
      )}
      {/* Loading state for initial load or if humanPlayer not ready */}
      {!showComparisonModal && !humanPlayerFromState && gameState.gameState === "HUMAN_ARRANGING" && !isLoadingNewGame && (
          <div className="app-loading">正在加载玩家数据...</div>
      )}
    </div>
  );
}

export default App;
