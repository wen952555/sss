// frontend_react/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import TopInfoBar from './components/TopInfoBar';
import HumanPlayerBoard from './components/HumanPlayerBoard';
import ActionButtons from './components/ActionButtons';
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
  [GameStates.INIT]: "准备开始",
  [GameStates.DEALING]: "发牌中...",
  HUMAN_ARRANGING: "请您分牌",
  [GameStates.COMPARING]: "比牌中...",
  [GameStates.RESULTS]: "查看结果",
};

function App() {
  const [gameState, setGameState] = useState(initialGameState);
  // arrangedHumanHand 现在包含玩家所有13张牌，初始时都放在一个地方，由玩家移动
  const [arrangedHumanHand, setArrangedHumanHand] = useState({ tou: [], zhong: [], wei: [] });
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  // selectedCard now stores { card: CardObject, fromDun: 'tou'|'zhong'|'wei'|'initial' }
  const [selectedCardInfo, setSelectedCardInfo] = useState(null);

  const humanPlayer = gameState.players.find(p => p.isHuman);

  const handleStartGame = useCallback(() => {
    setShowComparisonModal(false);
    setSelectedCardInfo(null);

    let newState = startGameLogic(initialGameState);

    newState.players = newState.players.map(player => {
      if (!player.isHuman) {
        const aiArrangement = arrangeCardsAILogic(player.hand);
        if (aiArrangement && isValidArrangementLogic(aiArrangement.tou, aiArrangement.zhong, aiArrangement.wei)) {
          const evalHands = {
            tou: evaluateHandLogic(aiArrangement.tou),
            zhong: evaluateHandLogic(aiArrangement.zhong),
            wei: evaluateHandLogic(aiArrangement.wei),
          };
          return { ...player, arranged: aiArrangement, evalHands, confirmed: true };
        } else {
          console.error(`AI ${player.name} failed to arrange cards or arranged invalidly (AGAIN).`);
          const fallbackTou = player.hand.slice(0,3);
          const fallbackZhong = player.hand.slice(3,8);
          const fallbackWei = player.hand.slice(8,13);
          if (fallbackTou.length === 3 && fallbackZhong.length === 5 && fallbackWei.length === 5 && isValidArrangementLogic(fallbackTou, fallbackZhong, fallbackWei)) {
            return {
               ...player,
               arranged: {tou: fallbackTou, zhong: fallbackZhong, wei: fallbackWei},
               evalHands: {
                   tou: evaluateHandLogic(fallbackTou),
                   zhong: evaluateHandLogic(fallbackZhong),
                   wei: evaluateHandLogic(fallbackWei),
               },
               confirmed: true
            };
          }
          return { ...player, arranged: {tou: [], zhong: [], wei: []}, evalHands: null, confirmed: true };
        }
      } else { // For human player, initially place all cards into a temporary 'initial' holding or directly to 'tou' for them to move
          setArrangedHumanHand({ tou: [...player.hand], zhong: [], wei: [] });
      }
      return player;
    });
    newState.gameState = "HUMAN_ARRANGING";
    setGameState(newState);
  }, []);

  const handleSubmitPlayerHand = useCallback(() => {
    if (!humanPlayer) return;
    const { tou, zhong, wei } = arrangedHumanHand;

    if (tou.length !== 3 || zhong.length !== 5 || wei.length !== 5) {
      alert(`墩牌数量不正确！\n头道需3张 (当前${tou.length}张)\n中道需5张 (当前${zhong.length}张)\n尾道需5张 (当前${wei.length}张)`);
      return;
    }
    if (!isValidArrangementLogic(tou, zhong, wei)) {
      alert("您的墩牌不合法！请确保头道 ≤ 中道 ≤ 尾道。");
      return;
    }

    let stateAfterHumanConfirm = confirmPlayerArrangementLogic(gameState, humanPlayer.id, arrangedHumanHand);
    const finalStateWithResults = compareAllHandsLogic(stateAfterHumanConfirm);
    setGameState(finalStateWithResults);
    setShowComparisonModal(true);
  }, [humanPlayer, arrangedHumanHand, gameState]);


  const handleAIHelperForHuman = useCallback(() => {
    if (humanPlayer && humanPlayer.hand.length === 13) {
      const suggestion = arrangeCardsAILogic(humanPlayer.hand);
      if (suggestion && isValidArrangementLogic(suggestion.tou, suggestion.zhong, suggestion.wei)) {
        setArrangedHumanHand(suggestion);
        setSelectedCardInfo(null);
      } else {
        alert("AI未能给出有效的分牌建议。");
      }
    }
  }, [humanPlayer]);

  // Card interaction logic
  const handleCardClick = useCallback((card, currentDunName) => {
    if (!selectedCardInfo) { // If no card is selected, select this one
      setSelectedCardInfo({ card, fromDun: currentDunName });
    } else { // A card is already selected
      if (selectedCardInfo.card.id === card.id && selectedCardInfo.fromDun === currentDunName) {
        // Clicked the same selected card again, de-select it
        setSelectedCardInfo(null);
      } else {
        // A card is selected, and clicked on another card (or empty dun area - handled by handleDunClick)
        // This case (clicking another card when one is selected) could be for swapping,
        // but for simplicity, we'll assume it means "place selected card here, if this is a dun"
        // The actual placement is handled by handleDunClick for an empty area.
        // If clicking another card: for now, just de-select the current one to avoid complex swap logic.
        // Or, better, if a card is selected, clicks on other cards are ignored unless it's a dun target.
         setSelectedCardInfo(null); // Deselect if clicked on another card instead of a dun target
      }
    }
  }, [selectedCardInfo]);

  const handleDunClick = useCallback((targetDunName) => {
    if (selectedCardInfo) { // If a card is selected, try to move it to this dun
      const { card, fromDun } = selectedCardInfo;
      if (fromDun === targetDunName) { // Clicked the same dun the card is from
        setSelectedCardInfo(null); // Just deselect
        return;
      }

      setArrangedHumanHand(prev => {
        const newArrangement = {
          tou: [...prev.tou],
          zhong: [...prev.zhong],
          wei: [...prev.wei],
        };
        // Remove card from its original dun
        if (fromDun !== 'initial') { // 'initial' means it was in the initial pile, not yet in a specific dun
             newArrangement[fromDun] = newArrangement[fromDun].filter(c => c.id !== card.id);
        }

        // Add card to the target dun (no size limit here, checked on submit)
        newArrangement[targetDunName] = [...newArrangement[targetDunName], card];
        return newArrangement;
      });
      setSelectedCardInfo(null); // Clear selection after moving
    }
    // If no card is selected, clicking a dun does nothing for now
    // (or could select the last card from that dun, for more complex UX)
  }, [selectedCardInfo]);


  useEffect(() => {
    if (gameState.gameState === GameStates.INIT) {
      if (!gameState.players.some(p => p.hand && p.hand.length > 0)) {
         handleStartGame();
      }
    }
  }, [gameState.gameState, gameState.players, handleStartG<ctrl63>
