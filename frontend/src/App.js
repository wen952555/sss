// frontend_react/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import TopInfoBar from './components/TopInfoBar';
import HumanPlayerBoard from './components/HumanPlayerBoard';
import ActionButtons from './components/ActionButtons';
import ComparisonModal from './components/ComparisonModal';
import AuthModal from './components/AuthModal'; // Import AuthModal
import ProfilePage from './components/ProfilePage'; // Import ProfilePage
import { authService } from './services/authService'; // Import authService
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

const GameStateDisplayNames = { /* ... (no changes) ... */ };

function App() {
  const [gameState, setGameState] = useState(initialGameState);
  const [arrangedHumanHand, setArrangedHumanHand] = useState({ tou: [], zhong: [], wei: [] });
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedCardsInfo, setSelectedCardsInfo] = useState([]);
  const [isLoadingNewGame, setIsLoadingNewGame] = useState(gameState.gameState === GameStates.INIT);

  // --- New Auth States ---
  const [currentUser, setCurrentUser] = useState(null); // { phone, id, points, token }
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState('login'); // 'login' or 'register'
  const [showProfilePage, setShowProfilePage] = useState(false);
  // --- End New Auth States ---

  const humanPlayerFromState = gameState.players.find(p => p.isHuman);

  // Check auth status on initial load
  useEffect(() => {
    const token = localStorage.getItem('authToken'); // Example: store token in localStorage
    if (token) {
      authService.checkAuthStatus(token)
        .then(user => {
          if (user) {
            setCurrentUser({ ...user, token });
          } else {
            localStorage.removeItem('authToken'); // Invalid token
          }
        })
        .catch(() => localStorage.removeItem('authToken'));
    }
  }, []);

  const initializeNewGame = useCallback(() => { /* ... (no changes to its internal logic) ... */ 
    console.time("initializeNewGameTotal"); setIsLoadingNewGame(true);
    setSelectedCardsInfo([]); setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    let newState = startGameLogic(initialGameState); let humanHandForAISuggestion = [];
    newState.players = newState.players.map(player => {
      if (!player.isHuman) {
        const aiArrangement = arrangeCardsAILogic(player.hand);
        if (aiArrangement && isValidArrangementLogic(aiArrangement.tou, aiArrangement.zhong, aiArrangement.wei)) {
          const evalH = { tou: evaluateHandLogic(aiArrangement.tou), zhong: evaluateHandLogic(aiArrangement.zhong), wei: evaluateHandLogic(aiArrangement.wei) };
          return { ...player, arranged: aiArrangement, evalHands: evalH, confirmed: true };
        } else { 
            const fT = player.hand.slice(0,3), fZ = player.hand.slice(3,8), fW = player.hand.slice(8,13);
            const eA = {tou:[],zhong:[],wei:[]}, eE = {tou:evaluateHandLogic([]),zhong:evaluateHandLogic([]),wei:evaluateHandLogic([])};
            if(fT.length===3&&fZ.length===5&&fW.length===5&&isValidArrangementLogic(fT,fZ,fW)){
                return { ...player, arranged:{tou:fT,zhong:fZ,wei:fW},evalHands:{tou:evaluateHandLogic(fT),zhong:evaluateHandLogic(fZ),wei:evaluateHandLogic(fW)},confirmed:true};
            } return { ...player, arranged:eA,evalHands:eE,confirmed:true};
        }
      } else { humanHandForAISuggestion=[...player.hand]; return player; }
    });
    if(humanHandForAISuggestion.length===13){ const initHumanAI=arrangeCardsAILogic(humanHandForAISuggestion);
      if(initHumanAI&&isValidArrangementLogic(initHumanAI.tou,initHumanAI.zhong,initHumanAI.wei)){setArrangedHumanHand(initHumanAI);}
      else{setArrangedHumanHand({tou:humanHandForAISuggestion.slice(0,3),zhong:humanHandForAISuggestion.slice(3,8),wei:humanHandForAISuggestion.slice(8,13)});}}
    else{setArrangedHumanHand({tou:[],zhong:[],wei:[]});}
    newState.gameState="HUMAN_ARRANGING"; setGameState(newState); setIsLoadingNewGame(false); console.timeEnd("initializeNewGameTotal");
  }, []);

  const handleCloseComparisonModalAndStartNewGame = useCallback(() => { /* ... (no changes) ... */ 
    setShowComparisonModal(false); setIsLoadingNewGame(true); 
    setTimeout(() => {
      setGameState(prev => {
          const scores=new Map(prev.players.map(p=>[p.id,p.score])); const cleanP=initialGameState.players.map(pI=>({...pI,score:scores.get(pI.id)||0,}));
          return {...initialGameState,players:cleanP,gameState:GameStates.INIT,};});
    }, 50); 
  }, []);

  useEffect(() => { /* ... (no changes, still handles initial game load) ... */ 
    if(gameState.gameState===GameStates.INIT){if(isLoadingNewGame){initializeNewGame();}else{setIsLoadingNewGame(true);setTimeout(()=>initializeNewGame(),0);}}
  }, [gameState.gameState,initializeNewGame,isLoadingNewGame]);

  const handleSubmitPlayerHand = useCallback(() => { /* ... (no changes) ... */ }, [humanPlayerFromState, arrangedHumanHand, gameState]);
  const handleAIHelperForHuman = useCallback(() => { /* ... (no changes) ... */ }, [gameState.players]);
  const handleCardClick = useCallback((cardClicked, currentDunOfCard) => { /* ... (no changes) ... */ }, []);
  const handleDunClick = useCallback((targetDunName) => { /* ... (no changes) ... */ }, [selectedCardsInfo]);
  
  // --- New Auth Handlers ---
  const handleLoginSuccess = (userData, token) => {
    setCurrentUser({ ...userData, token }); // Store token with user data
    localStorage.setItem('authToken', token); // Persist token
    setShowAuthModal(false);
    setShowProfilePage(true); // Go to profile page after login/register
  };

  const handleLogout = async () => {
    if (currentUser && currentUser.token) {
      try {
        await authService.logout(currentUser.token);
      } catch (error) {
        console.error("Logout error (mock):", error);
      }
    }
    setCurrentUser(null);
    localStorage.removeItem('authToken');
    setShowProfilePage(false); // Go back to game or main view
  };

  const handleManageProfile = () => {
    if (showProfilePage) { // If already on profile, maybe go back to game
        setShowProfilePage(false);
    } else if (currentUser) {
      setShowProfilePage(true); // Show profile page
      setShowAuthModal(false); // Ensure auth modal is hidden
    } else {
      setAuthModalView('login'); // Set default view for auth modal
      setShowAuthModal(true); // Show auth modal
      setShowProfilePage(false); // Ensure profile page is hidden
    }
  };

  const handleUpdatePoints = (newPoints) => {
    if (currentUser) {
      setCurrentUser(prev => ({ ...prev, points: newPoints }));
    }
  };
  // --- End New Auth Handlers ---

  const handleToggleAIPlay = useCallback(() => { console.log("AI托管 Clicked"); /* TODO */ }, []);
  const handleAutoMatch = useCallback(() => { console.log("自动匹配 Clicked"); /* TODO */ }, []);


  if (isLoadingNewGame) {
     return <div className="app-loading">请稍候，正在准备新一局...</div>;
  }

  // --- Conditional Rendering based on Auth/Profile State ---
  if (showAuthModal) {
    return <AuthModal initialView={authModalView} onClose={() => setShowAuthModal(false)} onLoginSuccess={handleLoginSuccess} />;
  }
  if (showProfilePage && currentUser) {
    return <ProfilePage currentUser={currentUser} onLogout={handleLogout} onUpdatePoints={handleUpdatePoints} onBackToGame={() => setShowProfilePage(false)} />;
  }
  // --- End Conditional Rendering ---

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
            canSubmit={/* ... */}
            onManageProfile={handleManageProfile} // Pass the handler
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
      {/* Fallback / Initial loading before game board is ready */}
      {!isLoadingNewGame && (!humanPlayerFromState || gameState.gameState !== "HUMAN_ARRANGING") && !showComparisonModal && !showAuthModal && !showProfilePage &&(
          <div className="app-loading">十三水游戏加载中... ({gameState.gameState})</div>
      )}
    </div>
  );
}

export default App;
