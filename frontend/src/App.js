// frontend_react/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import TopInfoBar from './components/TopInfoBar';
import HumanPlayerBoard from './components/HumanPlayerBoard';
import ActionButtons from './components/ActionButtons';
import ComparisonModal from './components/ComparisonModal';
import AuthModal from './components/AuthModal';
import ProfilePage from './components/ProfilePage';
import { authService } from './services/authService';
import { socketService } from './services/socketService';
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
  const [isLoadingApp, setIsLoadingApp] = useState(true);

  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const authModalInitialView = 'login'; // Default view for AuthModal

  const [showProfilePage, setShowProfilePage] = useState(false);

  // eslint-disable-next-line no-unused-vars
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [gameMode, setGameMode] = useState('singlePlayer');
  const [currentRoomId, setCurrentRoomId] = useState(null);

  const humanPlayerFromState = gameState.players.find(p => p.isHuman);

  const handleSocketConnect = useCallback(() => { setIsConnected(true); setIsReconnecting(false); console.log("App: WS Connected."); }, []);
  const handleSocketDisconnect = useCallback(() => { setIsConnected(false); console.warn("App: WS Disconnected."); }, []);
  const handleSocketReconnecting = useCallback(() => { setIsReconnecting(true); setIsConnected(false); console.log("App: WS Reconnecting..."); }, []);
  const handleGameStateUpdate = useCallback((newServerGameState) => { setGameState(prev => ({ ...prev, ...newServerGameState, players: newServerGameState.players || prev.players })); setIsLoadingApp(false); }, []);
  const handleRoomJoined = useCallback(({ success, roomId, gameState: serverGameState, yourPlayerId }) => {
    if (success) { setCurrentRoomId(roomId); socketService.storeSession(roomId, yourPlayerId || currentUser?.id); if (serverGameState) { handleGameStateUpdate(serverGameState); } }
    else { alert(`无法加入房间: ${roomId}`); setGameMode('singlePlayer'); setCurrentRoomId(null); }
    setIsLoadingApp(false);
  }, [currentUser, handleGameStateUpdate]);
  const handlePlayerArrangedNotification = useCallback((payload) => { setGameState(prev => ({ ...prev, players: prev.players.map(p => p.id === payload.playerId ? {...p, confirmed: true, arranged: payload.arranged} : p) })); }, []);

  useEffect(() => {
    socketService.on('connect', handleSocketConnect);
    socketService.on('disconnect', handleSocketDisconnect);
    socketService.on('reconnecting', handleSocketReconnecting);
    socketService.on('GAME_STATE_UPDATE', handleGameStateUpdate);
    socketService.on('ROOM_JOINED', handleRoomJoined);
    socketService.on('PLAYER_ARRANGED_HAND', handlePlayerArrangedNotification);
    return () => {
      socketService.off('connect', handleSocketConnect);
      socketService.off('disconnect', handleSocketDisconnect);
      socketService.off('reconnecting', handleSocketReconnecting);
      socketService.off('GAME_STATE_UPDATE', handleGameStateUpdate);
      socketService.off('ROOM_JOINED', handleRoomJoined);
      socketService.off('PLAYER_ARRANGED_HAND', handlePlayerArrangedNotification);
    };
  }, [handleSocketConnect, handleSocketDisconnect, handleSocketReconnecting, handleGameStateUpdate, handleRoomJoined, handlePlayerArrangedNotification]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) { try { const user = await authService.checkAuthStatus(token); if (user) setCurrentUser({ ...user, token }); else localStorage.removeItem('authToken'); } catch (error) { localStorage.removeItem('authToken'); setCurrentUser(null);}} else { setCurrentUser(null); }
    }; checkAuth();
  }, []);

  const initializeNewGame = useCallback(async (isCalledAfterAuthOrRestart = false) => {
    console.time("initializeNewGameTotal");
    setSelectedCardsInfo([]); setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    setShowComparisonModal(false);
    let newState = startGameLogic(initialGameState); let humanHandForAISuggestion = [];
    console.time("aiAndHumanSetup");
    const playerSetups = newState.players.map(player => {
        if(!player.isHuman){ const aiA=arrangeCardsAILogic(player.hand); if(aiA&&isValidArrangementLogic(aiA.tou,aiA.zhong,aiA.wei)){ const eH={tou:evaluateHandLogic(aiA.tou),zhong:evaluateHandLogic(aiA.zhong),wei:evaluateHandLogic(aiA.wei)}; return {...player,arranged:aiA,evalHands:eH,confirmed:true};} else { const fT=player.hand.slice(0,3),fZ=player.hand.slice(3,8),fW=player.hand.slice(8,13);const eA={tou:[],zhong:[],wei:[]},eE={tou:evaluateHandLogic([]),zhong:evaluateHandLogic([]),wei:evaluateHandLogic([])};const fbE={tou:evaluateHandLogic(fT),zhong:evaluateHandLogic(fZ),wei:evaluateHandLogic(fW)}; return (fT.length===3&&fZ.length===5&&fW.length===5&&isValidArrangementLogic(fT,fZ,fW))?{...player,arranged:{tou:fT,zhong:fZ,wei:fW},evalHands:fbE,confirmed:true}:{...player,arranged:eA,evalHands:eE,confirmed:true};}} else {humanHandForAISuggestion=[...player.hand]; return player;}
    });
    newState.players = playerSetups;
    console.timeEnd("aiAndHumanSetup");
    if(humanHandForAISuggestion.length===13){const initHumanAI=arrangeCardsAILogic(humanHandForAISuggestion);if(initHumanAI&&isValidArrangementLogic(initHumanAI.tou,initHumanAI.zhong,initHumanAI.wei)){setArrangedHumanHand(initHumanAI);}else{setArrangedHumanHand({tou:humanHandForAISuggestion.slice(0,3),zhong:humanHandForAISuggestion.slice(3,8),wei:humanHandForAISuggestion.slice(8,13)});}}else{setArrangedHumanHand({tou:[],zhong:[],wei:[]});}
    newState.gameState = "HUMAN_ARRANGING";
    setGameState(newState);
    if (isCalledAfterAuthOrRestart || !currentUser) { setIsLoadingApp(false); }
    console.timeEnd("initializeNewGameTotal");
  }, [currentUser]); // Added currentUser dependency

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

  useEffect(() => { // Handles initial load and game resets
    if (gameState.gameState === GameStates.INIT) {
      if (!isLoadingApp) { setIsLoadingApp(true); }
      const timer = setTimeout(() => { initializeNewGame(true); }, 0);
      return () => clearTimeout(timer);
    }
  }, [gameState.gameState, initializeNewGame, isLoadingApp]);

  const handleSubmitPlayerHand = useCallback(() => {
    if (!humanPlayerFromState) return;
    const { tou, zhong, wei } = arrangedHumanHand;
    const total = (tou?.length||0)+(zhong?.length||0)+(wei?.length||0);
    if(total!==13){alert(`总牌数需13张,当前${total}张`);return;}
    if((tou?.length||0)!==3||(zhong?.length||0)!==5||(wei?.length||0)!==5){alert(`墩牌数量错误`);return;}
    if(!isValidArrangementLogic(tou,zhong,wei)){alert("墩牌不合法!");return;}
    let stateAfterConfirm = confirmArrangement(gameState, humanPlayerFromState.id, arrangedHumanHand);
    const finalState = compareAllHands(stateAfterConfirm);
    setGameState(finalState); setShowComparisonModal(true);
  }, [humanPlayerFromState, arrangedHumanHand, gameState]);

  const handleAIHelperForHuman = useCallback(() => {
    const humanP = gameState.players.find(p => p.isHuman);
    if (humanP && humanP.hand && humanP.hand.length === 13) {
      const suggestion = arrangeCardsAILogic(humanP.hand);
      if (suggestion && isValidArrangementLogic(suggestion.tou, suggestion.zhong, suggestion.wei)) {
        setArrangedHumanHand(suggestion); setSelectedCardsInfo([]);
      } else { alert("AI未能给出建议。"); }
    }
  }, [gameState.players]);

  const handleCardClick = useCallback((cardClicked, currentDunOfCard) => {
    setSelectedCardsInfo(prev => { const idx=prev.findIndex(i=>i.card.id===cardClicked.id); return idx > -1 ? prev.filter((_,i)=>i!==idx) : [...prev, {card:cardClicked,fromDun:currentDunOfCard}]; });
  }, []);

  const handleDunClick = useCallback((targetDunName) => {
    if (selectedCardsInfo.length > 0) {
      setArrangedHumanHand(prev => { const newA={tou:[...prev.tou],zhong:[...prev.zhong],wei:[...prev.wei]}; const addT=[];
        selectedCardsInfo.forEach(sI=>{if(sI.fromDun&&newA[sI.fromDun]){newA[sI.fromDun]=newA[sI.fromDun].filter(c=>c.id!==sI.card.id);}addT.push(sI.card);});
        const eIds=new Set(newA[targetDunName].map(c=>c.id)); const uAdd=addT.filter(c=>!eIds.has(c.id));
        newA[targetDunName]=[...newA[targetDunName],...uAdd]; return newA;
      }); setSelectedCardsInfo([]);
    }
  }, [selectedCardsInfo]);

  const handleLoginSuccess = (userData, token) => {setCurrentUser({...userData,token});localStorage.setItem('authToken',token);setShowAuthModal(false);setShowProfilePage(true);setIsLoadingApp(false);};
  const handleLogout = async () => {setIsLoadingApp(true); await authService.logout(currentUser?.token); setCurrentUser(null); localStorage.removeItem('authToken'); setShowProfilePage(false); setGameMode('singlePlayer'); setCurrentRoomId(null); setGameState(prev => ({...prev, gameState: GameStates.INIT}));};
  const handleManageProfile = () => {if(showProfilePage){setShowProfilePage(false);}else if(currentUser){setShowProfilePage(true);setShowAuthModal(false);}else{setShowAuthModal(true);/* AuthModal will use its initialView */ setShowProfilePage(false);}};
  const handleUpdatePoints = (newPoints) => {if(currentUser){setCurrentUser(prev=>({...prev,points:newPoints}));}};
  const handleToggleAIPlay = useCallback(() => { console.log("AI托管 Clicked (TODO)"); }, []);
  const handleAutoMatch = useCallback(() => {
    if (!currentUser) { setShowAuthModal(true); return; }
    setGameMode('multiPlayer');
    const tempRoomId = `room_${Math.random().toString(36).substr(2, 5)}`;
    setCurrentRoomId(tempRoomId); setIsLoadingApp(true);
    socketService.connect(); // Connect should ideally trigger join/rejoin logic in its onopen
    console.log(`Attempting to join/create room: ${tempRoomId}`);
  }, [currentUser]);


  if (isLoadingApp) { return <div className="app-loading">请稍候，应用正在加载...</div>; }
  if (showAuthModal) { return <AuthModal initialView={authModalInitialView} onClose={() => setShowAuthModal(false)} onLoginSuccess={handleLoginSuccess} />; }
  if (showProfilePage && currentUser) { return <ProfilePage currentUser={currentUser} onLogout={handleLogout} onUpdatePoints={handleUpdatePoints} onBackToGame={() => setShowProfilePage(false)} />; }

  const currentStatusText = GameStateDisplayNames[gameState.gameState] || "进行中...";
  const playerNames = (gameMode === 'multiPlayer' && gameState.players.length > 1 && currentRoomId) ? // Added currentRoomId check
                      gameState.players.map(p => `${p.name}${p.id === currentUser?.id ? "(你)" : ""}`).join('、') :
                      gameState.players.map(p => p.name).join('、');
  const canSubmitGame = !!(arrangedHumanHand?.tou && arrangedHumanHand?.zhong && arrangedHumanHand?.wei && (arrangedHumanHand.tou.length + arrangedHumanHand.zhong.length + arrangedHumanHand.wei.length) === 13);

  if (gameMode === 'multiPlayer' && !currentRoomId && currentUser && !showComparisonModal) {
    return (
      <div className="app-container">
        <div className="room-selection-placeholder">
          <h2>多人游戏大厅</h2>
          <p>当前用户: {currentUser.phone} (ID: {currentUser.id})</p>
          <button onClick={handleAutoMatch}>快速开始 (自动匹配/创建)</button>
          <button onClick={() => { setGameMode('singlePlayer'); setIsLoadingApp(true); setGameState(prev => ({...prev, gameState: GameStates.INIT})); }}>返回单人游戏</button>
        </div>
      </div>
    );
  }
  
  if (humanPlayerFromState && (gameState.gameState === "HUMAN_ARRANGING" || (gameMode === 'multiPlayer' && currentRoomId)) && !showComparisonModal) {
    return (
      <div className="app-container">
        <TopInfoBar statusText={currentStatusText} playerNames={playerNames} />
        <div className="game-content-area">
          <HumanPlayerBoard arrangedHand={arrangedHumanHand} selectedCardsInfo={selectedCardsInfo} onCardClick={handleCardClick} onDunClick={handleDunClick}/>
        </div>
        <ActionButtons 
            onAIHelper={handleAIHelperForHuman} onSubmit={handleSubmitPlayerHand} canSubmit={canSubmitGame} 
            onManageProfile={handleManageProfile} onToggleAIPlay={handleToggleAIPlay} onAutoMatch={handleAutoMatch}
            isMultiplayer={gameMode === 'multiPlayer'}
        />
      </div>
    );
  }
  if (showComparisonModal) { return (<ComparisonModal players={gameState.players} onClose={handleCloseComparisonModalAndStartNewGame} isLoading={isLoadingApp} />); }
  
  return <div className="app-loading">正在准备游戏界面... ({gameState.gameState})</div>;
}

export default App;
