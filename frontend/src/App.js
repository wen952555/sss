// frontend_react/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { socketService } from './services/socketService'; // Import the service
// ... (other imports: TopInfoBar, HumanPlayerBoard, etc.)
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

const GameStateDisplayNames = { /* ... */ };

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

  // --- WebSocket related states ---
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
  const [isReconnecting, setIsReconnecting] = useState(false); // To show specific UI
  const [gameMode, setGameMode] = useState('singlePlayer'); // 'singlePlayer' or 'multiPlayer'
  const [currentRoomId, setCurrentRoomId] = useState(null); // Room ID from server or input
  // serverPlayerId might be part of currentUser if linked, or separate for guest sessions
  // For simplicity, let's assume if currentUser exists, currentUser.id is the serverPlayerId for auth actions
  // ---

  const humanPlayerFromState = gameState.players.find(p => p.isHuman);

  // --- WebSocket Event Handlers ---
  const handleSocketConnect = useCallback(() => {
    setIsConnected(true);
    setIsReconnecting(false);
    console.log("App: WebSocket Connected event received.");
    // After connecting, if in multiplayer and have a room, try to join/rejoin
    if (gameMode === 'multiPlayer' && currentRoomId && currentUser) {
      // This logic might be redundant if RECONNECT is handled by socketService.handleOpen
      // For now, let's assume JOIN_ROOM or a specific "HELLO" message is needed.
      // Or if sessionData exists in localStorage, socketService will send RECONNECT.
      console.log("App: Attempting to confirm room status post-connect.");
      // Example: socketService.sendMessage('CONFIRM_PRESENCE', { roomId: currentRoomId, playerId: currentUser.id });
    }
  }, [gameMode, currentRoomId, currentUser]);

  const handleSocketDisconnect = useCallback(({ reason, code }) => {
    setIsConnected(false);
    console.warn("App: WebSocket Disconnected event received.", reason, code);
    if (gameMode === 'multiPlayer' && code !== 1000) { // If not a clean manual disconnect
      // The service will handle reconnect attempts, App just updates UI
      // setIsReconnecting(true); // This might be set by 'reconnecting' event
    }
  }, [gameMode]);

  const handleSocketReconnecting = useCallback(({ attempt }) => {
    console.log(`App: WebSocket Reconnecting event received, attempt ${attempt}`);
    setIsReconnecting(true);
    setIsConnected(false); // Not fully connected yet
  }, []);

  const handleGameStateUpdate = useCallback((newServerGameState) => {
    console.log("App: GAME_STATE_UPDATE received", newServerGameState);
    // In multiplayer, server is the source of truth for gameState
    // We need to merge or replace local state.
    // Also, update arrangedHumanHand if it's part of the server state for the human player.
    setGameState(prev => ({
        ...prev, // Keep local scores, player names if not in server state
        ...newServerGameState, // Overwrite with server's game state
        players: newServerGameState.players || prev.players // Merge players carefully
    }));
    const human = newServerGameState.players?.find(p => p.id === currentUser?.id);
    if (human && human.arranged) {
        // If server sends full arrangement for human, update it.
        // Careful: this might overwrite human's local changes if server sends old data.
        // setArrangedHumanHand(human.arranged);
    }
    setIsLoadingApp(false); // Game state received, app is ready
  }, [currentUser]);

  const handleRoomJoined = useCallback(({ success, roomId, gameState: serverGameState, yourPlayerId }) => {
    if (success) {
      console.log(`App: Joined room ${roomId} successfully. Your ID: ${yourPlayerId}`);
      setCurrentRoomId(roomId);
      // serverPlayerId might be set here if it's different from currentUser.id
      // For now, assume currentUser.id is the primary identifier used with the server
      socketService.storeSession(roomId, yourPlayerId || currentUser?.id); // Store session
      if (serverGameState) {
        handleGameStateUpdate(serverGameState); // Initial game state from server
      }
    } else {
      alert(`Failed to join room: ${roomId}`);
      setGameMode('singlePlayer'); // Revert
      setCurrentRoomId(null);
    }
    setIsLoadingApp(false); // Done trying to join room
  }, [currentUser, handleGameStateUpdate]);
  
  // Example handler for a custom server message
  const handlePlayerArrangedNotification = useCallback((payload) => {
    console.log("App: Player arranged hand notification:", payload);
    // Update UI to show player payload.playerId has confirmed their hand
    setGameState(prev => ({
        ...prev,
        players: prev.players.map(p => p.id === payload.playerId ? {...p, confirmed: true, arranged: payload.arranged} : p)
    }));
  }, []);


  // --- Register WebSocket event listeners ---
  useEffect(() => {
    socketService.on('connect', handleSocketConnect);
    socketService.on('disconnect', handleSocketDisconnect);
    socketService.on('reconnecting', handleSocketReconnecting); // Custom event from service
    socketService.on('GAME_STATE_UPDATE', handleGameStateUpdate);
    socketService.on('ROOM_JOINED', handleRoomJoined); // Assuming server sends this after JOIN_ROOM
    socketService.on('PLAYER_ARRANGED_HAND', handlePlayerArrangedNotification);
    // Add more listeners for other message types...
    // e.g., socketService.on('ROUND_RESULTS', handleRoundResults);

    return () => { // Cleanup on unmount
      socketService.off('connect', handleSocketConnect);
      socketService.off('disconnect', handleSocketDisconnect);
      socketService.off('reconnecting', handleSocketReconnecting);
      socketService.off('GAME_STATE_UPDATE', handleGameStateUpdate);
      socketService.off('ROOM_JOINED', handleRoomJoined);
      socketService.off('PLAYER_ARRANGED_HAND', handlePlayerArrangedNotification);
      // socketService.disconnect(); // Optional: disconnect on App unmount
    };
  }, [handleSocketConnect, handleSocketDisconnect, handleSocketReconnecting, handleGameStateUpdate, handleRoomJoined, handlePlayerArrangedNotification]);


  // --- Game Initialization (Single Player and initial app load) ---
  const initializeNewGame = useCallback(async (isCalledAfterAuthOrRestart = false) => {
    // ... (Keep the initializeNewGame logic mostly for single player setup as before) ...
    // ... but ensure setIsLoadingApp(false) is called at the end ...
    console.time("initializeNewGame (SP)");
    setSelectedCardsInfo([]); setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    setShowComparisonModal(false);
    let newState = startGameLogic(initialGameState); let humanHandForAISuggestion = [];
    const playerSetups = newState.players.map(player => { /* ... AI setup ... */ 
        if(!player.isHuman){
            const aiArrangement = arrangeCardsAILogic(player.hand);
            if(aiArrangement && isValidArrangementLogic(aiArrangement.tou, aiArrangement.zhong, aiArrangement.wei)){
                return {...player, arranged: aiArrangement, evalHands: {tou: evaluateHandLogic(aiArrangement.tou), zhong: evaluateHandLogic(aiArrangement.zhong), wei: evaluateHandLogic(aiArrangement.wei)}, confirmed: true};
            } // else fallback
            const fT=player.hand.slice(0,3),fZ=player.hand.slice(3,8),fW=player.hand.slice(8,13); const eA={tou:[],zhong:[],wei:[]},eE={tou:evaluateHandLogic([]),zhong:evaluateHandLogic([]),wei:evaluateHandLogic([])}; const fbE={tou:evaluateHandLogic(fT),zhong:evaluateHandLogic(fZ),wei:evaluateHandLogic(fW)}; return (fT.length===3&&fZ.length===5&&fW.length===5&&isValidArrangementLogic(fT,fZ,fW))?{...player,arranged:{tou:fT,zhong:fZ,wei:fW},evalHands:fbE,confirmed:true}:{...player,arranged:eA,evalHands:eE,confirmed:true};
        } else {humanHandForAISuggestion=[...player.hand]; return player;}
    });
    newState.players = playerSetups;
    if(humanHandForAISuggestion.length===13){const initHumanAI=arrangeCardsAILogic(humanHandForAISuggestion); if(initHumanAI&&isValidArrangementLogic(initHumanAI.tou,initHumanAI.zhong,initHumanAI.wei)){setArrangedHumanHand(initHumanAI);}else{setArrangedHumanHand({tou:humanHandForAISuggestion.slice(0,3),zhong:humanHandForAISuggestion.slice(3,8),wei:humanHandForAISuggestion.slice(8,13)});}}else{setArrangedHumanHand({tou:[],zhong:[],wei:[]});}
    newState.gameState = "HUMAN_ARRANGING";
    setGameState(newState);
    if (isCalledAfterAuthOrRestart) setIsLoadingApp(false); // Only set loading false if this is the final step of app load
    console.timeEnd("initializeNewGame (SP)");
  }, []);

  useEffect(() => { // Handles initial load and game resets
    const performInitialSetup = async () => {
        await authService.checkAuthStatus(localStorage.getItem('authToken'))
            .then(user => {
                if (user) setCurrentUser({ ...user, token: localStorage.getItem('authToken') });
            });

        if (gameState.gameState === GameStates.INIT) {
            initializeNewGame(true); // True indicates it's part of initial load sequence
        } else {
            setIsLoadingApp(false); // If not INIT, and auth is checked, app might be ready
        }
    };
    if (isLoadingApp) { // Only run this if app is still in its initial loading phase
        performInitialSetup();
    }
  }, [isLoadingApp, gameState.gameState, initializeNewGame]); // Dependencies for initial setup sequence


  const handleCloseComparisonModalAndStartNewGame = useCallback(() => { /* ... (as before, sets gameState to INIT) ... */ }, []);
  const handleSubmitPlayerHand = useCallback(() => {
    if (gameMode === 'multiPlayer') {
      if (socketService.isConnected() && currentRoomId && currentUser) {
        const { tou, zhong, wei } = arrangedHumanHand;
        if((tou?.length||0) + (zhong?.length||0) + (wei?.length||0) !== 13 || (tou?.length||0)!==3||(zhong?.length||0)!==5||(wei?.length||0)!==5){alert("牌墩数量不正确"); return;}
        if(!isValidArrangementLogic(tou,zhong,wei)){alert("墩牌不合法"); return;}
        socketService.sendMessage('ARRANGE_HAND', { 
          roomId: currentRoomId, 
          playerId: currentUser.id, // Assuming this is the serverPlayerId
          arranged: arrangedHumanHand 
        });
        // Optimistically mark as confirmed, server will send final state
        // setGameState(prev => confirmArrangement(prev, currentUser.id, arrangedHumanHand));
        // Or wait for server confirmation via GAME_STATE_UPDATE or PLAYER_ARRANGED_HAND
        alert("牌型已提交至服务器!"); // Placeholder
      } else {
        alert("未连接到多人游戏服务器。");
      }
    } else { // Single Player
      // ... (existing single player handleSubmitPlayerHand logic)
      if (!humanPlayerFromState) return; const{tou,zhong,wei}=arrangedHumanHand;const total=(tou?.length||0)+(zhong?.length||0)+(wei?.length||0);if(total!==13){alert("总牌数错误");return;}if((tou?.length||0)!==3||(zhong?.length||0)!==5||(wei?.length||0)!==5){alert("墩牌数量错误");return;}if(!isValidArrangementLogic(tou,zhong,wei)){alert("墩牌不合法");return;}let sACH=confirmArrangement(gameState,humanPlayerFromState.id,arrangedHumanHand);const fSWR=compareAllHands(sACH);setGameState(fSWR);setShowComparisonModal(true);
    }
  }, [humanPlayerFromState, arrangedHumanHand, gameState, gameMode, currentRoomId, currentUser]);
  
  // ... (other handlers: handleAIHelperForHuman, handleCardClick, handleDunClick, auth handlers) ...
  const handleAIHelperForHuman = useCallback(() => { /* ... */ }, [gameState.players]);
  const handleCardClick = useCallback((card, dun) => { /* ... */ }, []);
  const handleDunClick = useCallback((dunName) => { /* ... */ }, [selectedCardsInfo]);
  const handleLoginSuccess = (user, token) => {setCurrentUser({...user, token}); localStorage.setItem('authToken', token); setShowAuthModal(false); setShowProfilePage(true); setIsLoadingApp(false);};
  const handleLogout = async () => {setIsLoadingApp(true); await authService.logout(currentUser?.token); setCurrentUser(null); localStorage.removeItem('authToken'); setShowProfilePage(false); setGameMode('singlePlayer'); setCurrentRoomId(null); setGameState(prev => ({...prev, gameState: GameStates.INIT})); /* setIsLoadingApp will be false via initializeNewGame */};
  const handleManageProfile = () => {/* ... */};
  const handleUpdatePoints = (newPoints) => {/* ... */};
  const handleToggleAIPlay = useCallback(() => { console.log("AI托管 Clicked (TODO)"); }, []);
  const handleAutoMatch = useCallback(() => { 
    if (!currentUser) { setShowAuthModal(true); return; }
    setGameMode('multiPlayer'); 
    // TODO: Implement actual matchmaking call or UI to select/create room
    const tempRoomId = `room_${Math.random().toString(36).substr(2, 5)}`;
    setCurrentRoomId(tempRoomId);
    setIsLoadingApp(true); // Show loading while attempting to connect/join
    socketService.connect(); // Attempt connection
    // After connection (in onopen/handleSocketConnect), send JOIN_ROOM or CREATE_ROOM
    // For now, let's assume onopen handles sending join request if roomId is set.
    console.log(`Attempting to join/create room: ${tempRoomId}`);
  }, [currentUser]);


  if (isLoadingApp) { return <div className="app-loading">请稍候，应用正在加载...</div>; }
  if (isReconnecting && gameMode === 'multiPlayer') { return <div className="app-loading">与服务器断开连接，正在尝试重连...</div>; }
  if (showAuthModal) { return <AuthModal initialView={authModalView} onClose={() => setShowAuthModal(false)} onLoginSuccess={handleLoginSuccess} />; }
  if (showProfilePage && currentUser) { return <ProfilePage currentUser={currentUser} onLogout={handleLogout} onUpdatePoints={handleUpdatePoints} onBackToGame={() => setShowProfilePage(false)} />; }

  // Main game rendering or room selection for multiplayer
  if (gameMode === 'multiPlayer' && !currentRoomId && currentUser) {
    return (
      <div className="app-container">
        {/* Placeholder for Room Selection/Creation UI */}
        <div className="room-selection-placeholder">
          <h2>多人游戏大厅</h2>
          <p>当前用户: {currentUser.phone} (ID: {currentUser.id})</p>
          <button onClick={() => handleAutoMatch()}>快速开始 (自动匹配/创建)</button>
          {/* TODO: Add input for specific room ID and join button */}
          <button onClick={() => { setGameMode('singlePlayer'); initializeNewGame(true); }}>返回单人游戏</button>
        </div>
      </div>
    );
  }
  
  // ... (rest of the rendering logic for game board and comparison modal)
  const currentStatusText = GameStateDisplayNames[gameState.gameState] || "进行中...";
  const playerNames = (gameMode === 'multiPlayer' && gameState.players.length > 1) ? 
                      gameState.players.map(p => `${p.name}${p.id === currentUser?.id ? "(你)" : ""}`).join('、') :
                      gameState.players.map(p => p.name).join('、');
  const canSubmitGame = !!(arrangedHumanHand?.tou && arrangedHumanHand?.zhong && arrangedHumanHand?.wei && (arrangedHumanHand.tou.length + arrangedHumanHand.zhong.length + arrangedHumanHand.wei.length) === 13);

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
            isMultiplayer={gameMode === 'multiPlayer'} // Pass mode to potentially change button text/behavior
        />
      </div>
    );
  }
  if (showComparisonModal) { return (<ComparisonModal players={gameState.players} onClose={handleCloseComparisonModalAndStartNewGame} isLoading={isLoadingApp} />); }
  return <div className="app-loading">正在准备游戏界面... ({gameState.gameState})</div>;
}

export default App;
