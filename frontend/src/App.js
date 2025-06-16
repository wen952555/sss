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
  confirmArrangement, // Using direct import
  compareAllHands,    // Using direct import
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
  const [isLoadingApp, setIsLoadingApp] = useState(true);

  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState('login');
  const [showProfilePage, setShowProfilePage] = useState(false);

  const humanPlayerFromState = gameState.players.find(p => p.isHuman);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const user = await authService.checkAuthStatus(token);
          if (user) { setCurrentUser({ ...user, token }); }
          else { localStorage.removeItem('authToken'); setCurrentUser(null); }
        } catch (error) { localStorage.removeItem('authToken'); setCurrentUser(null); }
      } else { setCurrentUser(null); }
    };
    checkAuth();
  }, []);

  const initializeNewGame = useCallback(async () => {
    console.time("initializeNewGameTotal");
    setSelectedCardsInfo([]); setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    setShowComparisonModal(false);
    let newState = startGameLogic(initialGameState);
    let humanHandForAISuggestion = [];
    console.time("aiAndHumanSetup");
    const playerSetups = newState.players.map(player => {
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
      } else { humanHandForAISuggestion=[...player.hand]; return player;}
    });
    newState.players = playerSetups; // Directly assign if map is synchronous
    console.timeEnd("aiAndHumanSetup");
    if (humanHandForAISuggestion.length === 13) {
      const initialHumanAIArrangement = arrangeCardsAILogic(humanHandForAISuggestion);
      if (initialHumanAIArrangement && isValidArrangementLogic(initialHumanAIArrangement.tou, initialHumanAIArrangement.zhong, initialHumanAIArrangement.wei)) {
        setArrangedHumanHand(initialHumanAIArrangement);
      } else { const dTou=humanHandForAISuggestion.slice(0,3),dZhong=humanHandForAISuggestion.slice(3,8),dWei=humanHandForAISuggestion.slice(8,13); setArrangedHumanHand({ tou:dTou,zhong:dZhong,wei:dWei });}
    } else { setArrangedHumanHand({ tou: [], zhong: [], wei: [] }); }
    newState.gameState = "HUMAN_ARRANGING";
    setGameState(newState);
    setIsLoadingApp(false);
    console.timeEnd("initializeNewGameTotal");
  }, []); // Removed currentUser, as it's used for conditional rendering path, not directly in init logic that changes per currentUser value itself

  const handleCloseComparisonModalAndStartNewGame = useCallback(() => {
    setShowComparisonModal(false); setIsLoadingApp(true);
    setTimeout(() => {
      setGameState(prev => {
          const scores=new Map(prev.players.map(p=>[p.id,p.score]));
          const cleanP=initialGameState.players.map(pI=>({...pI,score:scores.get(pI.id)||0}));
          return {...initialGameState,players:cleanP,gameState:GameStates.INIT};
      });
    }, 50);
  }, []);

  useEffect(() => {
    if (gameState.gameState === GameStates.INIT) {
      if (!isLoadingApp) { setIsLoadingApp(true); }
      const timer = setTimeout(() => { initializeNewGame(); }, 0);
      return () => clearTimeout(timer);
    }
  }, [gameState.gameState, initializeNewGame, isLoadingApp]);

  // Line 157 was here
  const handleSubmitPlayerHand = useCallback(() => {
    // This function's dependencies are values it directly reads from the component scope.
    // confirmArrangement and compareAllHands are stable imports.
    const localHumanPlayer = gameState.players.find(p => p.isHuman); // Get latest from gameState
    if (!localHumanPlayer) return;

    const { tou, zhong, wei } = arrangedHumanHand; // This is from state
    const total = (tou?.length||0)+(zhong?.length||0)+(wei?.length||0);
    if(total!==13){alert(`总牌数需13张,当前${total}张`);return;}
    if((tou?.length||0)!==3||(zhong?.length||0)!==5||(wei?.length||0)!==5){alert(`墩牌数量不正确！`);return;}
    if(!isValidArrangementLogic(tou,zhong,wei)){alert("墩牌不合法!");return;}
    
    // Use confirmArrangement and compareAllHands directly
    let stateAfterConfirm = confirmArrangement(gameState, localHumanPlayer.id, arrangedHumanHand);
    const finalState = compareAllHands(stateAfterConfirm);
    setGameState(finalState); // This will update gameState, triggering re-renders
    setShowComparisonModal(true);
  }, [arrangedHumanHand, gameState]); // humanPlayerFromState is derived from gameState

  // Line 158 was here
  const handleAIHelperForHuman = useCallback(() => {
    const humanP = gameState.players.find(p => p.isHuman); // Get latest from gameState.players
    if (humanP && humanP.hand && humanP.hand.length === 13) {
      const suggestion = arrangeCardsAILogic(humanP.hand);
      if (suggestion && isValidArrangementLogic(suggestion.tou, suggestion.zhong, suggestion.wei)) {
        setArrangedHumanHand(suggestion);
        setSelectedCardsInfo([]); // This uses the setter, which is stable
      } else { alert("AI未能给出建议。"); }
    }
  }, [gameState.players]); // Only depends on gameState.players

  // Line 160 was here
  const handleCardClick = useCallback((cardClicked, currentDunOfCard) => {
    setSelectedCardsInfo(prev => { const idx=prev.findIndex(i=>i.card.id===cardClicked.id); return idx > -1 ? prev.filter((_,i)=>i!==idx) : [...prev, {card:cardClicked,fromDun:currentDunOfCard}]; });
  }, []); // setSelectedCardsInfo is stable

  const handleDunClick = useCallback((targetDunName) => {
    // This function depends on selectedCardsInfo state
    if (selectedCardsInfo.length > 0) {
      setArrangedHumanHand(prev => { const newA={tou:[...prev.tou],zhong:[...prev.zhong],wei:[...prev.wei]}; const addT=[];
        selectedCardsInfo.forEach(sI=>{if(sI.fromDun&&newA[sI.fromDun]){newA[sI.fromDun]=newA[sI.fromDun].filter(c=>c.id!==sI.card.id);}addT.push(sI.card);});
        const eIds=new Set(newA[targetDunName].map(c=>c.id)); const uAdd=addT.filter(c=>!eIds.has(c.id));
        newA[targetDunName]=[...newA[targetDunName],...uAdd]; return newA;
      }); setSelectedCardsInfo([]);
    }
  }, [selectedCardsInfo]); // Correct dependency

  const handleLoginSuccess = (userData, token) => {setCurrentUser({...userData,token});localStorage.setItem('authToken',token);setShowAuthModal(false);setShowProfilePage(true);setIsLoadingApp(false);};
  const handleLogout = async () => {setIsLoadingApp(true); await authService.logout(currentUser?.token);setCurrentUser(null);localStorage.removeItem('authToken');setShowProfilePage(false);setIsLoadingApp(false);setGameState(prev => ({...prev, gameState: GameStates.INIT}));};
  const handleManageProfile = () => {if(showProfilePage){setShowProfilePage(false);}else if(currentUser){setShowProfilePage(true);setShowAuthModal(false);}else{setAuthModalView('login');setShowAuthModal(true);setShowProfilePage(false);}};
  const handleUpdatePoints = (newPoints) => {if(currentUser){setCurrentUser(prev=>({...prev,points:newPoints}));}};
  const handleToggleAIPlay = useCallback(() => { console.log("AI托管 Clicked"); }, []);
  const handleAutoMatch = useCallback(() => { console.log("自动匹配 Clicked"); }, []);

  if (isLoadingApp) { return <div className="app-loading">请稍候，正在加载游戏数据...</div>; }
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
      {showComparisonModal && (<ComparisonModal players={gameState.players} onClose={handleCloseComparisonModalAndStartNewGame} isLoading={isLoadingApp /* Renamed to isLoadingApp */} /> )}
      {!isLoadingApp && (!humanPlayerFromState || gameState.gameState !== "HUMAN_ARRANGING") && !showComparisonModal && !showAuthModal && !showProfilePage &&( <div className="app-loading">十三水游戏加载中... ({gameState.gameState})</div> )}
    </div>
  );
}

export default App;
