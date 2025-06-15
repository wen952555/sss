// frontend_react/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import TopInfoBar from './components/TopInfoBar';
import HumanPlayerBoard from './components/HumanPlayerBoard';
import ActionButtons from './components/ActionButtons';
import ComparisonModal from './components/ComparisonModal';
import {
  initialGameState,
  startGame as startGameLogic,
  confirmArrangement as confirmArrangementLogicInternal, // Use internal name
  compareAllHands as compareAllHandsLogicInternal,     // Use internal name
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
  [GameStates.RESULTS]: "查看结果",
};

function App() {
  const [gameState, setGameState] = useState(initialGameState);
  const [arrangedHumanHand, setArrangedHumanHand] = useState({ tou: [], zhong: [], wei: [] });
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedCardsInfo, setSelectedCardsInfo] = useState([]);
  const [isLoadingNewGame, setIsLoadingNewGame] = useState(gameState.gameState === GameStates.INIT);

  const humanPlayerFromState = gameState.players.find(p => p.isHuman);

  const initializeNewGame = useCallback(() => {
    console.time("initializeNewGameTotal");
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
          const evalHands = { tou: evaluateHandLogic(aiArrangement.tou), zhong: evaluateHandLogic(aiArrangement.zhong), wei: evaluateHandLogic(aiArrangement.wei) };
          return { ...player, arranged: aiArrangement, evalHands, confirmed: true };
        } else { 
            const fallbackTou = player.hand.slice(0,3); const fallbackZhong = player.hand.slice(3,8); const fallbackWei = player.hand.slice(8,13);
            const emptyArr = {tou: [], zhong: [], wei: []};
            const fbEval = {tou: evaluateHandLogic(fallbackTou), zhong: evaluateHandLogic(fallbackZhong), wei: evaluateHandLogic(fallbackWei)};
            const emptyEval = {tou: evaluateHandLogic([]), zhong: evaluateHandLogic([]), wei: evaluateHandLogic([])};
            if(fallbackTou.length === 3 && fallbackZhong.length === 5 && fallbackWei.length === 5 && isValidArrangementLogic(fallbackTou, fallbackZhong, fallbackWei)) {
                return { ...player, arranged: {tou: fallbackTou, zhong: fallbackZhong, wei: fallbackWei}, evalHands: fbEval, confirmed: true };
            }
            return { ...player, arranged: emptyArr, evalHands: emptyEval, confirmed: true };
        }
      } else { humanHandForAISuggestion = [...player.hand]; return player; }
    });
    if (humanHandForAISuggestion.length === 13) {
      console.time("humanInitialAIArrange"); const initialHumanAIArrangement = arrangeCardsAILogic(humanHandForAISuggestion); console.timeEnd("humanInitialAIArrange");
      if (initialHumanAIArrangement && isValidArrangementLogic(initialHumanAIArrangement.tou, initialHumanAIArrangement.zhong, initialHumanAIArrangement.wei)) {
        setArrangedHumanHand(initialHumanAIArrangement);
      } else { setArrangedHumanHand({ tou: humanHandForAISuggestion.slice(0,3), zhong: humanHandForAISuggestion.slice(3,8), wei: humanHandForAISuggestion.slice(8,13) }); }
    } else { setArrangedHumanHand({ tou: [], zhong: [], wei: [] }); }
    console.timeEnd("aiAndHumanSetup");
    newState.gameState = "HUMAN_ARRANGING";
    console.time("setInitialGameState"); setGameState(newState); console.timeEnd("setInitialGameState");
    setIsLoadingNewGame(false); 
    console.timeEnd("initializeNewGameTotal");
  }, []); // Imported logic functions are stable, so they don't need to be dependencies of initializeNewGame

  const handleCloseComparisonModalAndStartNewGame = useCallback(() => {
    setShowComparisonModal(false); setIsLoadingNewGame(true); 
    setTimeout(() => {
      setGameState(prevOriginalState => {
          const preservedScores = new Map(prevOriginalState.players.map(p => [p.id, p.score]));
          const newCleanPlayers = initialGameState.players.map(pInit => ({ ...pInit, score: preservedScores.get(pInit.id) || 0, }));
          return { ...initialGameState, players: newCleanPlayers, gameState: GameStates.INIT, };
      });
    }, 50); 
  }, []); // No external dependencies that change

  useEffect(() => {
    if (gameState.gameState === GameStates.INIT) {
        if (isLoadingNewGame) { initializeNewGame(); } 
        else { setIsLoadingNewGame(true); setTimeout(() => initializeNewGame(), 0); }
    }
  }, [gameState.gameState, initializeNewGame, isLoadingNewGame]);


  const handleSubmitPlayerHand = useCallback(() => {
    if (!humanPlayerFromState) return;
    const { tou, zhong, wei } = arrangedHumanHand;
    const totalCardsInDuns = tou.length + zhong.length + wei.length;
    if (totalCardsInDuns !== 13) { alert(`总牌数必须是13张，当前为 ${totalCardsInDuns} 张。请检查各墩牌数。`); return; }
    if (tou.length !== 3 || zhong.length !== 5 || wei.length !== 5) { alert(`墩牌数量不正确！\n头道需3张 (当前${tou.length}张)\n中道需5张 (当前${zhong.length}张)\n尾道需5张 (当前${wei.length}张)`); return; }
    if (!isValidArrangementLogic(tou, zhong, wei)) { alert("您的墩牌不合法！请确保头道 ≤ 中道 ≤ 尾道。"); return; }

    // Use the imported functions directly
    let stateAfterHumanConfirm = confirmArrangementLogicInternal(gameState, humanPlayerFromState.id, arrangedHumanHand);
    const finalStateWithResults = compareAllHandsLogicInternal(stateAfterHumanConfirm);
    setGameState(finalStateWithResults);
    setShowComparisonModal(true);
  }, [humanPlayerFromState, arrangedHumanHand, gameState]); // Dependencies: state values used directly

  const handleAIHelperForHuman = useCallback(() => {
    const humanP = gameState.players.find(p => p.isHuman);
    if (humanP && humanP.hand && humanP.hand.length === 13) {
      const suggestion = arrangeCardsAILogic(humanP.hand); // arrangeCardsAILogic is stable
      if (suggestion && isValidArrangementLogic(suggestion.tou, suggestion.zhong, suggestion.wei)) { // isValidArrangementLogic is stable
        setArrangedHumanHand(suggestion);
        setSelectedCardsInfo([]);
      } else {
        alert("AI未能给出新的有效分牌建议。");
      }
    }
  }, [gameState.players]); // Dependency: gameState.players is used

  const handleCardClick = useCallback((cardClicked, currentDunOfCard) => {
    setSelectedCardsInfo(prevSelected => {
      const existingIndex = prevSelected.findIndex(info => info.card.id === cardClicked.id);
      if (existingIndex > -1) {
        return prevSelected.filter((_, index) => index !== existingIndex);
      } else {
        return [...prevSelected, { card: cardClicked, fromDun: currentDunOfCard }];
      }
    });
  }, []); // No dependencies that change

  const handleDunClick = useCallback((targetDunName) => {
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
  }, [selectedCardsInfo]); // Dependency: selectedCardsInfo is used


  // Placeholder handlers for new buttons
  const handleManageProfile = useCallback(() => { console.log("个人管理 Clicked"); }, []);
  const handleToggleAIPlay = useCallback(() => { console.log("AI托管 Clicked"); }, []);
  const handleAutoMatch = useCallback(() => { console.log("自动匹配 Clicked"); }, []);


  if (isLoadingNewGame) {
     return <div className="app-loading">请稍候，正在准备新一局...</div>;
  }

  const currentStatusText = GameStateDisplayNames[gameState.gameState] || "进行中...";
  const playerNames = gameState.players.map(p => p.name).join('、');

  return (
    <div className="app-container">
      {!showComparisonModal && humanPlayerFromState && gameState.gameState === "HUMAN_ARRANGING" && (
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
            onManageProfile={handleManageProfile}
            onToggleAIPlay={handleToggleAIPlay}
            onAutoMatch={handleAutoMatch}
          />
        </>
      )}

      {showComparisonModal && (
        <ComparisonModal
          players={gameState.players}
          onClose={handleCloseComparisonModalAndStartNewGame}
          isLoading={isLoadingNewGame}
        />
      )}
      {!isLoadingNewGame && (!humanPlayerFromState || gameState.gameState !== "HUMAN_ARRANGING") && !showComparisonModal && (
          <div className="app-loading">正在加载游戏... ({gameState.gameState})</div>
      )}
    </div>
  );
}

export default App;
