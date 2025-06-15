// frontend_react/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import TopInfoBar from './components/TopInfoBar';
import HumanPlayerBoard from './components/HumanPlayerBoard';
import ActionButtons from './components/ActionButtons'; // Make sure this is imported
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
  [GameStates.RESULTS]: "查看结果",
};

function App() {
  const [gameState, setGameState] = useState(initialGameState);
  const [arrangedHumanHand, setArrangedHumanHand] = useState({ tou: [], zhong: [], wei: [] });
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedCardsInfo, setSelectedCardsInfo] = useState([]);
  const [isLoadingNewGame, setIsLoadingNewGame] = useState(gameState.gameState === GameStates.INIT);

  const humanPlayerFromState = gameState.players.find(p => p.isHuman);

  const initializeNewGame = useCallback(() => { /* ... (no change from previous) ... */ 
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
  }, []); 

  const handleCloseComparisonModalAndStartNewGame = useCallback(() => { /* ... (no change) ... */ 
    setShowComparisonModal(false); setIsLoadingNewGame(true); 
    setTimeout(() => {
      setGameState(prevOriginalState => {
          const preservedScores = new Map(prevOriginalState.players.map(p => [p.id, p.score]));
          const newCleanPlayers = initialGameState.players.map(pInit => ({ ...pInit, score: preservedScores.get(pInit.id) || 0, }));
          return { ...initialGameState, players: newCleanPlayers, gameState: GameStates.INIT, };
      });
    }, 50); 
  }, []);

  useEffect(() => { /* ... (no change) ... */ 
    if (gameState.gameState === GameStates.INIT) {
        if (isLoadingNewGame) { initializeNewGame(); } 
        else { setIsLoadingNewGame(true); setTimeout(() => initializeNewGame(), 0); }
    }
  }, [gameState.gameState, initializeNewGame, isLoadingNewGame]);

  const handleSubmitPlayerHand = useCallback(() => { /* ... (no change) ... */ }, [humanPlayerFromState, arrangedHumanHand, gameState]);
  const handleAIHelperForHuman = useCallback(() => { /* ... (no change) ... */ }, [gameState.players]);
  const handleCardClick = useCallback((cardClicked, currentDunOfCard) => { /* ... (no change) ... */ }, []);
  const handleDunClick = useCallback((targetDunName) => { /* ... (no change) ... */ }, [selectedCardsInfo]);

  // Placeholder handlers for new buttons
  const handleManageProfile = useCallback(() => { console.log("个人管理 Clicked"); /* TODO */ }, []);
  const handleToggleAIPlay = useCallback(() => { console.log("AI托管 Clicked"); /* TODO */ }, []);
  const handleAutoMatch = useCallback(() => { console.log("自动匹配 Clicked"); /* TODO */ }, []);


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
          <div className="game-content-area"> {/* This will now be the main scrollable area if content overflows */}
            <HumanPlayerBoard
              arrangedHand={arrangedHumanHand}
              selectedCardsInfo={selectedCardsInfo}
              onCardClick={handleCardClick}
              onDunClick={handleDunClick}
            />
          </div>
          {/* ActionButtons are now a banner below HumanPlayerBoard */}
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
