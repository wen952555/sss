// frontend_react/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import TopInfoBar from './components/TopInfoBar';
import HumanPlayerBoard from './components/HumanPlayerBoard';
import ActionButtons from './components/ActionButtons';
import ComparisonModal from './components/ComparisonModal';
import AuthModal from './components/AuthModal';
import ProfilePage from './components/ProfilePage';
import { authService } from './services/authService';
import {
  initialGameState,
  startGame as startGameLogic,
  confirmArrangement as confirmArrangementLogicInternal,
  compareAllHands as compareAllHandsLogicInternal,
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
  
  // --- Auth States ---
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState('login');
  const [showProfilePage, setShowProfilePage] = useState(false);
  // --- End Auth States ---

  // isLoadingNewGame now also considers if we are waiting for initial auth check
  const [isLoadingApp, setIsLoadingApp] = useState(true); // True initially, covers auth check and first game load

  const humanPlayerFromState = gameState.players.find(p => p.isHuman);

  // Effect for checking auth status on initial load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const user = await authService.checkAuthStatus(token);
          if (user) {
            setCurrentUser({ ...user, token });
          } else {
            localStorage.removeItem('authToken'); // Invalid or expired token
            setCurrentUser(null);
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          localStorage.removeItem('authToken');
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null); // No token found
      }
      // setIsLoadingApp(false); // We will set this to false after initial game is also ready
    };
    checkAuth();
  }, []); // Run only once on app mount


  const initializeNewGame = useCallback(async () => { // Made async for potential future async ops
    console.time("initializeNewGameTotal");
    // setIsLoadingApp(true); // This should already be true or set by caller

    setSelectedCardsInfo([]);
    setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    setShowComparisonModal(false);

    console.time("startGameLogic");
    let newState = startGameLogic(initialGameState);
    console.timeEnd("startGameLogic");

    let humanHandForAISuggestion = [];
    console.time("aiAndHumanSetup");
    // Using Promise.all if AI arrangement could be async in the future, for now it's sync
    const playerPromises = newState.players.map(async (player) => {
      if (!player.isHuman) {
        // console.time(`aiArrange-${player.id}`);
        const aiArrangement = arrangeCardsAILogic(player.hand); // Assuming this is synchronous
        // console.timeEnd(`aiArrange-${player.id}`);
        if (aiArrangement && isValidArrangementLogic(aiArrangement.tou, aiArrangement.zhong, aiArrangement.wei)) {
          const evalH = { tou: evaluateHandLogic(aiArrangement.tou), zhong: evaluateHandLogic(aiArrangement.zhong), wei: evaluateHandLogic(aiArrangement.wei) };
          return { ...player, arranged: aiArrangement, evalHands: evalH, confirmed: true };
        } else {
            const fT = player.hand.slice(0,3), fZ = player.hand.slice(3,8), fW = player.hand.slice(8,13);
            const eA = {tou:[],zhong:[],wei:[]}, eE = {tou:evaluateHandLogic([]),zhong:evaluateHandLogic([]),wei:evaluateHandLogic([])};
            const fbEval = {tou: evaluateHandLogic(fT), zhong: evaluateHandLogic(fZ), wei: evaluateHandLogic(fW)};
            if(fT.length===3&&fZ.length===5&&fW.length===5&&isValidArrangementLogic(fT,fZ,fW)){
                return { ...player, arranged:{tou:fT,zhong:fZ,wei:fW},evalHands:fbEval,confirmed:true};
            } return { ...player, arranged:eA,evalHands:eE,confirmed:true};
        }
      } else {
        humanHandForAISuggestion = [...player.hand];
        return player;
      }
    });
    newState.players = await Promise.all(playerPromises); // Resolve all player setups
    console.timeEnd("aiAndHumanSetup");

    if (humanHandForAISuggestion.length === 13) {
      // console.time("humanInitialAIArrange");
      const initialHumanAIArrangement = arrangeCardsAILogic(humanHandForAISuggestion);
      // console.timeEnd("humanInitialAIArrange");
      if (initialHumanAIArrangement && isValidArrangementLogic(initialHumanAIArrangement.tou, initialHumanAIArrangement.zhong, initialHumanAIArrangement.wei)) {
        setArrangedHumanHand(initialHumanAIArrangement);
      } else {
        const defaultTou = humanHandForAISuggestion.slice(0,3);
        const defaultZhong = humanHandForAISuggestion.slice(3,8);
        const defaultWei = humanHandForAISuggestion.slice(8,13);
        setArrangedHumanHand({ tou: defaultTou, zhong: defaultZhong, wei: defaultWei });
      }
    } else {
      setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    }
    
    newState.gameState = "HUMAN_ARRANGING";
    // console.time("setFinalInitialGameState");
    setGameState(newState);
    // console.timeEnd("setFinalInitialGameState");

    setIsLoadingApp(false); // Game is ready, set loading to false
    console.timeEnd("initializeNewGameTotal");
  }, []); // Removed isLoadingApp from here, it's managed differently


  const handleCloseComparisonModalAndStartNewGame = useCallback(() => {
    setShowComparisonModal(false);
    setIsLoadingApp(true); // Indicate loading for the new game setup
    setTimeout(() => {
      // Reset game state structure first, then initializeNewGame will be triggered by useEffect
      setGameState(prev => {
          const scores=new Map(prev.players.map(p=>[p.id,p.score]));
          const cleanP=initialGameState.players.map(pI=>({...pI,score:scores.get(pI.id)||0}));
          return {...initialGameState,players:cleanP,gameState:GameStates.INIT};
      });
    }, 50);
  }, []);

  // Effect for starting/restarting the game
  useEffect(() => {
    if (gameState.gameState === GameStates.INIT) {
      // This effect triggers when gameState becomes INIT.
      // We ensure isLoadingApp is true before calling initializeNewGame.
      if (!isLoadingApp) { // If not already set by handleClose... or initial load
        setIsLoadingApp(true);
      }
      // Use a timeout to allow isLoadingApp state to propagate and UI to update
      // before running potentially heavy initializeNewGame.
      const timer = setTimeout(() => {
        initializeNewGame();
      }, 0); // Small delay is usually sufficient
      return () => clearTimeout(timer);
    }
  }, [gameState.gameState, initializeNewGame, isLoadingApp]); // Added isLoadingApp to re-evaluate if it changes


  const handleSubmitPlayerHand = useCallback(() => { /* ... (no changes) ... */ }, [humanPlayerFromState, arrangedHumanHand, gameState]);
  const handleAIHelperForHuman = useCallback(() => { /* ... (no changes) ... */ }, [gameState.players]);
  const handleCardClick = useCallback((cardClicked, currentDunOfCard) => { /* ... (no changes) ... */ }, []);
  const handleDunClick = useCallback((targetDunName) => { /* ... (no changes) ... */ }, [selectedCardsInfo]);
  
  const handleLoginSuccess = (userData, token) => { setCurrentUser({...userData,token}); localStorage.setItem('authToken',token); setShowAuthModal(false); setShowProfilePage(true); };
  const handleLogout = async () => { setIsLoadingApp(true); await authService.logout(currentUser?.token); setCurrentUser(null); localStorage.removeItem('authToken'); setShowProfilePage(false); setIsLoadingApp(false);};
  const handleManageProfile = () => { if(showProfilePage){setShowProfilePage(false);}else if(currentUser){setShowProfilePage(true);setShowAuthModal(false);}else{setAuthModalView('login');setShowAuthModal(true);setShowProfilePage(false);}};
  const handleUpdatePoints = (newPoints) => { if(currentUser){setCurrentUser(prev=>({...prev,points:newPoints}));}};
  const handleToggleAIPlay = useCallback(() => { console.log("AI托管 Clicked"); }, []);
  const handleAutoMatch = useCallback(() => { console.log("自动匹配 Clicked"); }, []);

  // Renamed isLoadingNewGame to isLoadingApp for clarity
  if (isLoadingApp) {
     return <div className="app-loading">请稍候，正在加载游戏数据...</div>;
  }

  if (showAuthModal) { return <AuthModal initialView={authModalView} onClose={() => setShowAuthModal(false)} onLoginSuccess={handleLoginSuccess} />; }
  if (showProfilePage && currentUser) { return <ProfilePage currentUser={currentUser} onLogout={handleLogout} onUpdatePoints={handleUpdatePoints} onBackToGame={() => setShowProfilePage(false)} />; }

  const currentStatusText = GameStateDisplayNames[gameState.gameState] || "进行中...";
  const playerNames = gameState.players.map(p => p.name).join('、');
  const canSubmitGame = !!(arrangedHumanHand?.tou && arrangedHumanHand?.zhong && arrangedHumanHand?.wei && (arrangedHumanHand.tou.length + arrangedHumanHand.zhong.length + arrangedHumanHand.wei.length) === 13);

  return (
    <div className="app-container">
      {!showComparisonModal && humanPlayerFromState && gameState.gameState === "HUMAN_ARRANGING" && (
        <>
          <TopInfoBar statusText={currentStatusText} playerNames={playerNames} />
          <div className="game-content-area">
            <HumanPlayerBoard arrangedHand={arrangedHumanHand} selectedCardsInfo={selectedCardsInfo} onCardClick={handleCardClick} onDunClick={handleDunClick}/>
          </div>
          <ActionButtons onAIHelper={handleAIHelperForHuman} onSubmit={handleSubmitPlayerHand} canSubmit={canSubmitGame} onManageProfile={handleManageProfile} onToggleAIPlay={handleToggleAIPlay} onAutoMatch={handleAutoMatch}/>
        </>
      )}
      {showComparisonModal && (<ComparisonModal players={gameState.players} onClose={handleCloseComparisonModalAndStartNewGame} isLoading={isLoadingApp}/> )}
      {/* Fallback for states where game board isn't ready but not explicitly loading a *new* game via button */}
      { !showAuthModal && !showProfilePage && !showComparisonModal && gameState.gameState !== "HUMAN_ARRANGING" && (
          <div className="app-loading">正在准备游戏界面... ({gameState.gameState})</div>
      )}
    </div>
  );
}

export default App;
