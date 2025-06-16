// frontend_react/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import TopInfoBar from './components/TopInfoBar';
import HumanPlayerBoard from './components/HumanPlayerBoard';
import ActionButtons from './components/ActionButtons';
import ComparisonModal from './components/ComparisonModal';
import AuthModal from './components/AuthModal';
import ProfilePage from './components/ProfilePage';
import { authService } from './services/authService';
import { socketService } from './services/socketService'; // Assuming socketService exists
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
  // const [authModalView, setAuthModalView] = useState('login'); // Removed as AuthModal handles its own view
  const authModalInitialView = 'login'; // Pass as prop if needed, or AuthModal defaults

  const [showProfilePage, setShowProfilePage] = useState(false);

  // eslint-disable-next-line no-unused-vars
  const [isConnected, setIsConnected] = useState(socketService.isConnected()); // Keep for future, mark unused for now
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [gameMode, setGameMode] = useState('singlePlayer');
  const [currentRoomId, setCurrentRoomId] = useState(null);

  const humanPlayerFromState = gameState.players.find(p => p.isHuman);

  // --- WebSocket Event Handlers (from previous multiplayer setup) ---
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
  // --- End WebSocket Event Handlers ---


  useEffect(() => { /* ... (Auth check useEffect - no changes) ... */ 
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) { try { const user = await authService.checkAuthStatus(token); if (user) setCurrentUser({ ...user, token }); else localStorage.removeItem('authToken'); } catch (error) { localStorage.removeItem('authToken'); setCurrentUser(null);}} else { setCurrentUser(null); }
    }; checkAuth();
  }, []);

  const initializeNewGame = useCallback(async () => { /* ... (no changes to its internal logic) ... */ 
    console.time("initializeNewGameTotal"); setIsLoadingApp(true);
    setSelectedCardsInfo([]); setArrangedHumanHand({ tou: [], zhong: [], wei: [] }); setShowComparisonModal(false);
    let newState = startGameLogic(initialGameState); let humanHandForAISuggestion = [];
    const playerSetups = newState.players.map(player => {
      if(!player.isHuman){ const aiA=arrangeCardsAILogic(player.hand); if(aiA&&isValidArrangementLogic(aiA.tou,aiA.zhong,aiA.wei)){ const eH={tou:evaluateHandLogic(aiA.tou),zhong:evaluateHandLogic(aiA.zhong),wei:evaluateHandLogic(aiA.wei)}; return {...player,arranged:aiA,evalHands:eH,confirmed:true};} else { const fT=player.hand.slice(0,3),fZ=player.hand.slice(3,8),fW=player.hand.slice(8,13);const eA={tou:[],zhong:[],wei:[]},eE={tou:evaluateHandLogic([]),zhong:evaluateHandLogic([]),wei:evaluateHandLogic([])};const fbE={tou:evaluateHandLogic(fT),zhong:evaluateHandLogic(fZ),wei:evaluateHandLogic(fW)}; return(fT.length===3&&fZ.length===5&&fW.length===5&&isValidArrangementLogic(fT,fZ,fW))?{...player,arranged:{tou:fT,zhong:fZ,wei:fW},evalHands:fbE,confirmed:true}:{...player,arranged:eA,evalHands:eE,confirmed:true};}} else {humanHandForAISuggestion=[...player.hand]; return player;}
    }); newState.players = playerSetups;
    if(humanHandForAISuggestion.length===13){const initHA=arrangeCardsAILogic(humanHandForAISuggestion);if(initHA&&isValidArrangementLogic(initHA.tou,initHA.zhong,initHA.wei)){setArrangedHumanHand(initHA);}else{setArrangedHumanHand({tou:humanHandForAISuggestion.slice(0,3),zhong:humanHandForAISuggestion.slice(3,8),wei:humanHandForAISuggestion.slice(8,13)});}}else{setArrangedHumanHand({tou:[],zhong:[],wei:[]});}
    newState.gameState="HUMAN_ARRANGING"; setGameState(newState); setIsLoadingApp(false); console.timeEnd("initializeNewGameTotal");
  }, []);

  const handleCloseComparisonModalAndStartNewGame = useCallback(() => { /* ... (no changes) ... */ }, []);
  useEffect(() => { /* ... (no changes to game init useEffect) ... */ }, [gameState.gameState, initializeNewG
