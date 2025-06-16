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
  confirmArrangement,
  compareAllHands,
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
  
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState('login');
  const [showProfilePage, setShowProfilePage] = useState(false);
  
  // isLoadingApp will be true until both auth status is checked AND initial game is ready (if not logged in)
  const [isLoadingApp, setIsLoadingApp] = useState(true); 

  const humanPlayerFromState = gameState.players.find(p => p.isHuman);

  // Phase 1: Check authentication status on initial mount
  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const user = await authService.checkAuthStatus(token);
          if (user) {
            setCurrentUser({ ...user, token });
            // If user is authenticated, we might not need to immediately initialize a new game
            // unless that's the desired flow. For now, we'll let the next useEffect handle game init.
            // Or, if logged in, maybe directly show profile or last game state.
            // For simplicity: auth is checked, then game init proceeds.
          } else {
            localStorage.removeItem('authToken'); // Invalid token
            setCurrentUser(null);
          }
        } catch (error) {
          console.error("Auth check failed on load:", error);
          localStorage.removeItem('authToken');
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null); // No token found
      }
      // setIsLoadingApp(false); // DO NOT set to false here yet. Game init might still be pending.
      // The GameStates.INIT useEffect will handle setting isLoadingApp to false after game init.
    };
    verifyAuth();
  }, []); // Run only once on app mount

  const initializeNewGame = useCallback(async (isFirstLoadAfterAuth = false) => {
    console.time("initializeNewGameTotal");
    // setIsLoadingApp(true) should be managed by the caller or the useEffect triggering this

    setSelectedCardsInfo([]);
    setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    setShowComparisonModal(false);

    let newState = startGameLogic(initialGameState);
    let humanHandForAISuggestion = [];

    console.time("aiAndHumanSetup");
    const playerSetups = newState.players.map(player => { // No need for async/await if AI logic is sync
      if (!player.isHuman) {
        const aiArrangement = arrangeCardsAILogic(player.hand);
        if (aiArrangement && isValidArrangementLogic(aiArrangement.tou, aiArrangement.zhong, aiArrangement.wei)) {
          const evalH = { tou: evaluateHandLogic(aiArrangement.tou), zhong: evaluateHandLogic(aiArrangement.zhong), wei: evaluateHandLogic(aiArrangement.wei) };
          return { ...player, arranged: aiArrangement, evalHands: evalH, confirmed: true };
        } else {
            const fT=player.hand.slice(0,3),fZ=player.hand.slice(3,8),fW=player.hand.slice(8,13);
            const eA={tou:[],zhong:[],wei:[]},eE={tou:evaluateHandLogic([]),zhong:evaluateHandLogic([]),wei:evaluateHandLogic([])};
            const fbE={tou:evaluateHandLogic(fT),zhong:evaluateHandLogic(fZ),wei:evaluateHandLogic(fW)};
            return (fT.length===3&&fZ.length===5&&fW.length===5&&isValidArrangementLogic(fT,fZ,fW)) ?
                   {...player,arranged:{tou:fT,zhong:fZ,wei:fW},evalHands:fbE,confirmed:true} :
                   {...player,arranged:eA,evalHands:eE,confirmed:true};
        }
      } else { humanHandForAISuggestion=[...player.hand]; return player; }
    });
    newState.players = playerSetups; // Assign directly if map is synchronous
    console.timeEnd("aiAndHumanSetup");

    if(humanHandForAISuggestion.length===13){
      const initHumanAI=arrangeCardsAILogic(humanHandForAISuggestion);
      if(initHumanAI&&isValidArrangementLogic(initHumanAI.tou,initHumanAI.zhong,initHumanAI.wei)){setArrangedHumanHand(initHumanAI);}
      else{setArrangedHumanHand({tou:humanHandForAISuggestion.slice(0,3),zhong:humanHandForAISuggestion.slice(3,8),wei:humanHandForAISuggestion.slice(8,13)});}}
    else{setArrangedHumanHand({tou:[],zhong:[],wei:[]});}
    
    newState.gameState = "HUMAN_ARRANGING";
    setGameState(newState);
    
    // Only set isLoadingApp to false after everything, including the first game setup, is done.
    if (isFirstLoadAfterAuth || !currentUser) { // Set loading false after initial game load
        setIsLoadingApp(false);
    }
    console.timeEnd("initializeNewGameTotal");
  }, [currentUser]); // Add currentUser as dependency, so if auth state changes, init logic might re-evaluate

  const handleCloseComparisonModalAndStartNewGame = useCallback(() => {
    setShowComparisonModal(false);
    setIsLoadingApp(true); 
    setTimeout(() => {
      setGameState(prev => {
          const scores=new Map(prev.players.map(p=>[p.id,p.score]));
          const cleanP=initialGameState.players.map(pI=>({...pI,score:scores.get(pI.id)||0}));
          return {...initialGameState,players:cleanP,gameState:GameStates.INIT};
      });
    }, 50);
  }, []);

  // Phase 2: Initialize game when gameState is INIT (after auth check might have completed)
  useEffect(() => {
    if (gameState.gameState === GameStates.INIT) {
        // If currentUser is still null after auth check, it means not logged in, proceed to init game.
        // If currentUser is available, game still needs to init.
        // The initializeNewGame will set isLoadingApp to false.
        if (!isLoadingApp) setIsLoadingApp(true); // Ensure loading is true before init
        
        const timer = setTimeout(() => {
            initializeNewGame(true); // Pass a flag indicating this is part of initial app load sequence
        }, 0);
        return () => clearTimeout(timer);
    }
  }, [gameState.gameState, initializeNewGame, isLoadingApp]); // isLoadingApp ensures this runs when app is ready


  const handleSubmitPlayerHand = useCallback(() => { /* ... (no changes) ... */ }, [humanPlayerFromState, arrangedHumanHand, gameState, confirmArrangement, compareAllHands]);
  const handleAIHelperForHuman = useCallback(() => { /* ... (no changes) ... */ }, [gameState.players]);
  const handleCardClick = useCallback((cardClicked, currentDunOfCard) => { /* ... (no changes) ... */ }, []);
  const handleDunClick = useCallback((targetDunName) => { /* ... (no changes) ... */ }, [selectedCardsInfo]);
  
  const handleLoginSuccess = (userData, token) => { setCurrentUser({...userData,token}); localStorage.setItem('authToken',token); setShowAuthModal(false); setShowProfilePage(true); setIsLoadingApp(false); /* User is now logged in, app is ready */};
  const handleLogout = async () => { setIsLoadingApp(true); await authService.logout(currentUser?.token); setCurrentUser(null); localStorage.removeItem('authToken'); setShowProfilePage(false); setIsLoadingApp(false); /* After logout, app is ready for non-auth view or game init */ setGameState(prev => ({...prev, gameState: GameStates.INIT})); /* Optionally reset to game init */};
  const handleManageProfile = () => {if(showProfilePage){setShowProfilePage(false);}else if(currentUser){setShowProfilePage(true);setShowAuthModal(false);}else{setAuthModalView('login');setShowAuthModal(true);setShowProfilePage(false);}};
  const handleUpdatePoints = (newPoints) => {if(currentUser){setCurrentUser(prev=>({...prev,points:newPoints}));}};
  const handleToggleAIPlay = useCallback(() => { console.log("AI托管 Clicked"); }, []);
  const handleAutoMatch = useCallback(() => { console.log("自动匹配 Clicked"); }, []);


  if (isLoadingApp) {
     return <div className="app-loading">请稍候，应用正在加载...</div>;
  }

  // After loading, decide what to show
  if (showAuthModal) { return <AuthModal initialView={authModalView} onClose={() => setShowAuthModal(false)} onLoginSuccess={handleLoginSuccess} />; }
  if (showProfilePage && currentUser) { return <ProfilePage currentUser={currentUser} onLogout={handleLogout} onUpdatePoints={handleUpdatePoints} onBackToGame={() => setShowProfilePage(false)} />; }

  // If not showing auth/profile, and game is ready for arranging, show game board
  const currentStatusText = GameStateDisplayNames[gameState.gameState] || "进行中...";
  const playerNames = gameState.players.map(p => p.name).join('、');
  const canSubmitGame = !!(arrangedHumanHand?.tou && arrangedHumanHand?.zhong && arrangedHumanHand?.wei && (arrangedHumanHand.tou.length + arrangedHumanHand.zhong.length + arrangedHumanHand.wei.length) === 13);

  if (humanPlayerFromState && gameState.gameState === "HUMAN_ARRANGING" && !showComparisonModal) {
    return (
      <div className="app-container">
        <TopInfoBar statusText={currentStatusText} playerNames={playerNames} />
        <div className="game-content-area">
          <HumanPlayerBoard arrangedHand={arrangedHumanHand} selectedCardsInfo={selectedCardsInfo} onCardClick={handleCardClick} onDunClick={handleDunClick}/>
        </div>
        <ActionButtons onAIHelper={handleAIHelperForHuman} onSubmit={handleSubmitPlayerHand} canSubmit={canSubmitGame} onManageProfile={handleManageProfile} onToggleAIPlay={handleToggleAIPlay} onAutoMatch={handleAutoMatch}/>
      </div>
    );
  }

  if (showComparisonModal) {
    return (<ComparisonModal players={gameState.players} onClose={handleCloseComparisonModalAndStartNewGame} isLoading={isLoadingApp /* pass the app loading state if button is in modal */} />);
  }
  
  // Fallback or if gameState is RESULTS but modal is not shown (e.g. after logout leading to INIT)
  // This also catches the very initial state if nothing else matches.
  return <div className="app-loading">正在准备游戏界面... ({gameState.gameState})</div>;
}

export default App;
