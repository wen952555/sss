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
  const [isLoadingNewGame, setIsLoadingNewGame] = useState(gameState.gameState === GameStates.INIT);

  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState('login');
  const [showProfilePage, setShowProfilePage] = useState(false);

  const humanPlayerFromState = gameState.players.find(p => p.isHuman);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // To prevent flashing loading state if auth check is very fast
      // We might set isLoadingNewGame true only if initializeNewGame is also about to run
      authService.checkAuthStatus(token)
        .then(user => {
          if (user) { setCurrentUser({ ...user, token });}
          else { localStorage.removeItem('authToken'); }
        })
        .catch(() => localStorage.removeItem('authToken'));
    }
  }, []);

  const initializeNewGame = useCallback(() => {
    console.time("initializeNewGameTotal");
    // setIsLoadingNewGame is set true before calling this
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
          const evalH = { tou: evaluateHandLogic(aiArrangement.tou), zhong: evaluateHandLogic(aiArrangement.zhong), wei: evaluateHandLogic(aiArrangement.wei) };
          return { ...player, arranged: aiArrangement, evalHands: evalH, confirmed: true };
        } else {
            console.error(`AI ${player.name} failed initial arrangement. Using fallback.`);
            const fT = player.hand.slice(0,3);
            const fZ = player.hand.slice(3,8);
            const fW = player.hand.slice(8,13);
            const eA = {tou:[],zhong:[],wei:[]};
            const eE = {tou:evaluateHandLogic([]),zhong:evaluateHandLogic([]),wei:evaluateHandLogic([])};
            const fbEval = {tou: evaluateHandLogic(fT), zhong: evaluateHandLogic(fZ), wei: evaluateHandLogic(fW)};
            if(fT.length===3&&fZ.length===5&&fW.length===5&&isValidArrangementLogic(fT,fZ,fW)){
                return { ...player, arranged:{tou:fT,zhong:fZ,wei:fW},evalHands:fbEval,confirmed:true};
            }
            return { ...player, arranged:eA,evalHands:eE,confirmed:true};
        }
      } else {
        humanHandForAISuggestion=[...player.hand];
        return player;
      }
    });

    if(humanHandForAISuggestion.length===13){
      console.time("humanInitialAIArrange");
      const initialHumanAIArrangement = arrangeCardsAILogic(humanHandForAISuggestion);
      console.timeEnd("humanInitialAIArrange");
      if(initialHumanAIArrangement && isValidArrangementLogic(initialHumanAIArrangement.tou, initialHumanAIArrangement.zhong, initialHumanAIArrangement.wei)){
        setArrangedHumanHand(initialHumanAIArrangement);
      } else {
        console.error("AI failed to provide initial valid arrangement for human. Defaulting to simple split.");
        const defaultTou = humanHandForAISuggestion.slice(0,3);
        const defaultZhong = humanHandForAISuggestion.slice(3,8);
        const defaultWei = humanHandForAISuggestion.slice(8,13);
        setArrangedHumanHand({ tou: defaultTou, zhong: defaultZhong, wei: defaultWei });
      }
    } else {
        setArrangedHumanHand({tou:[],zhong:[],wei:[]});
    }
    console.timeEnd("aiAndHumanSetup");

    newState.gameState="HUMAN_ARRANGING";
    console.time("setFinalInitialGameState");
    setGameState(newState);
    console.timeEnd("setFinalInitialGameState");

    setIsLoadingNewGame(false);
    console.timeEnd("initializeNewGameTotal");
  }, []); // Dependencies: startGameLogic, arrangeCardsAILogic, etc. are stable imports

  const handleCloseComparisonModalAndStartNewGame = useCallback(() => {
    setShowComparisonModal(false);
    setIsLoadingNewGame(true);
    setTimeout(() => {
      setGameState(prev => {
          const scores=new Map(prev.players.map(p=>[p.id,p.score]));
          const cleanP=initialGameState.players.map(pI=>({...pI,score:scores.get(pI.id)||0}));
          return {...initialGameState,players:cleanP,gameState:GameStates.INIT};
      });
    }, 50); // Small delay for UI update
  }, []);

  useEffect(() => {
    if (gameState.gameState === GameStates.INIT) {
      if (!isLoadingNewGame) { // Only trigger if not already loading
        setIsLoadingNewGame(true);
        // Use a timeout to ensure isLoadingNewGame state update is processed before heavy init
        setTimeout(() => initializeNewGame(), 0);
      } else if (isLoadingNewGame && typeof initializeNewGame === 'function') {
        // If it was already loading and initializeNewGame is ready, call it.
        // This path might be redundant if the above `if(!isLoadingNewGame)` is the main entry.
        // Consider simplifying this useEffect's condition.
        // For now, this ensures that if `isLoadingNewGame` was set true elsewhere (e.g. initial state),
        // and `gameState.gameState` becomes `INIT`, `initializeNewGame` will run.
         initializeNewGame();
      }
    }
  }, [gameState.gameState, initializeNewGame, isLoadingNewGame]);


  const handleSubmitPlayerHand = useCallback(() => {
    if (!humanPlayerFromState) return;
    const { tou, zhong, wei } = arrangedHumanHand;
    const totalCardsInDuns = (tou?.length || 0) + (zhong?.length || 0) + (wei?.length || 0);
    if (totalCardsInDuns !== 13) { alert(`总牌数必须是13张，当前为 ${totalCardsInDuns} 张。请检查各墩牌数。`); return; }
    if ((tou?.length || 0) !== 3 || (zhong?.length || 0) !== 5 || (wei?.length || 0) !== 5) { alert(`墩牌数量不正确！\n头道需3张 (当前${tou?.length||0}张)\n中道需5张 (当前${zhong?.length||0}张)\n尾道需5张 (当前${wei?.length||0}张)`); return; }
    if (!isValidArrangementLogic(tou, zhong, wei)) { alert("您的墩牌不合法！请确保头道 ≤ 中道 ≤ 尾道。"); return; }
    let stateAfterHumanConfirm = confirmArrangementLogicInternal(gameState, humanPlayerFromState.id, arrangedHumanHand);
    const finalStateWithResults = compareAllHandsLogicInternal(stateAfterHumanConfirm);
    setGameState(finalStateWithResults); setShowComparisonModal(true);
  }, [humanPlayerFromState, arrangedHumanHand, gameState]);

  const handleAIHelperForHuman = useCallback(() => {
    const humanP = gameState.players.find(p => p.isHuman);
    if (humanP && humanP.hand && humanP.hand.length === 13) {
      const suggestion = arrangeCardsAILogic(humanP.hand);
      if (suggestion && isValidArrangementLogic(suggestion.tou, suggestion.zhong, suggestion.wei)) { setArrangedHumanHand(suggestion); setSelectedCardsInfo([]); }
      else { alert("AI未能给出新的有效分牌建议。"); }
    }
  }, [gameState.players]);

  const handleCardClick = useCallback((cardClicked, currentDunOfCard) => {
    setSelectedCardsInfo(prev => { const idx = prev.findIndex(i=>i.card.id===cardClicked.id); if(idx > -1) return prev.filter((_,i)=>i!==idx); else return [...prev, {card:cardClicked,fromDun:currentDunOfCard}];});
  }, []); // This dependency array is intentionally empty if setSelectedCardsInfo is the only external variable used in a way that matters.

  const handleDunClick = useCallback((targetDunName) => {
    if (selectedCardsInfo.length > 0) {
      setArrangedHumanHand(prev => { const newA = {tou:[...prev.tou],zhong:[...prev.zhong],wei:[...prev.wei]}; const addTarget=[];
        selectedCardsInfo.forEach(sI=>{ if(sI.fromDun&&newA[sI.fromDun]){newA[sI.fromDun]=newA[sI.fromDun].filter(c=>c.id!==sI.card.id);} addTarget.push(sI.card);});
        const existIds=new Set(newA[targetDunName].map(c=>c.id)); const uniqueAdd=addTarget.filter(c=>!existIds.has(c.id));
        newA[targetDunName]=[...newA[targetDunName],...uniqueAdd]; return newA;
      }); setSelectedCardsInfo([]);
    }
  }, [selectedCardsInfo]);

  const handleLoginSuccess = (userData, token) => { setCurrentUser({...userData,token}); localStorage.setItem('authToken',token); setShowAuthModal(false); setShowProfilePage(true); };
  const handleLogout = async () => { if(currentUser&¤tUser.token){try{await authService.logout(currentUser.token);}catch(e){console.error("Logout mock err:",e);}} setCurrentUser(null); localStorage.removeItem('authToken'); setShowProfilePage(false);};
  const handleManageProfile = () => { if(showProfilePage){setShowProfilePage(false);}else if(currentUser){setShowProfilePage(true);setShowAuthModal(false);}else{setAuthModalView('login');setShowAuthModal(true);setShowProfilePage(false);}};
  const handleUpdatePoints = (newPoints) => { if(currentUser){setCurrentUser(prev=>({...prev,points:newPoints}));}};
  const handleToggleAIPlay = useCallback(() => { console.log("AI托管 Clicked"); }, []);
  const handleAutoMatch = useCallback(() => { console.log("自动匹配 Clicked"); }, []);

  if (isLoadingNewGame) { return <div className="app-loading">请稍候，正在准备新一局...</div>; }

  if (showAuthModal) { return <AuthModal initialView={authModalView} onClose={() => setShowAuthModal(false)} onLoginSuccess={handleLoginSuccess} />; }
  if (showProfilePage && currentUser) { return <ProfilePage currentUser={currentUser} onLogout={handleLogout} onUpdatePoints={handleUpdatePoints} onBackToGame={() => setShowProfilePage(false)} />; }

  const currentStatusText = GameStateDisplayNames[gameState.gameState] || "进行中...";
  const playerNames = gameState.players.map(p => p.name).join('、');

  const canSubmitGame = !!(
    arrangedHumanHand &&
    arrangedHumanHand.tou &&
    arrangedHumanHand.zhong &&
    arrangedHumanHand.wei &&
    (arrangedHumanHand.tou.length + arrangedHumanHand.zhong.length + arrangedHumanHand.wei.length) === 13
  );

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
            canSubmit={canSubmitGame}
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
      {!isLoadingNewGame && (!humanPlayerFromState || gameState.gameState !== "HUMAN_ARRANGING") && !showComparisonModal && !showAuthModal && !showProfilePage &&(
          <div className="app-loading">十三水游戏加载中... ({gameState.gameState})</div>
      )}
    </div>
  );
}

export default App;
