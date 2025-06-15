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
  [GameStates.INIT]: "正在准备游戏...",
  [GameStates.DEALING]: "发牌中...",
  HUMAN_ARRANGING: "请您调整牌型", // Changed text
  [GameStates.RESULTS]: "查看结果",
};

function App() {
  const [gameState, setGameState] = useState(initialGameState);
  // arrangedHumanHand will now be initialized with an AI suggestion
  const [arrangedHumanHand, setArrangedHumanHand] = useState({ tou: [], zhong: [], wei: [] });
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedCardInfo, setSelectedCardInfo] = useState(null);

  const humanPlayerFromState = gameState.players.find(p => p.isHuman); // Renamed to avoid conflict

  const initializeNewGame = useCallback(() => {
    setShowComparisonModal(false);
    setSelectedCardInfo(null);
    // arrangedHumanHand will be set after AI suggestion for human

    let newState = startGameLogic(initialGameState); // Deals cards to all players

    let humanHandForAISuggestion = [];

    newState.players = newState.players.map(player => {
      if (!player.isHuman) { // For AI players
        const aiArrangement = arrangeCardsAILogic(player.hand);
        if (aiArrangement && isValidArrangementLogic(aiArrangement.tou, aiArrangement.zhong, aiArrangement.wei)) {
          const evalHands = {
            tou: evaluateHandLogic(aiArrangement.tou),
            zhong: evaluateHandLogic(aiArrangement.zhong),
            wei: evaluateHandLogic(aiArrangement.wei),
          };
          return { ...player, arranged: aiArrangement, evalHands, confirmed: true };
        } else {
          console.error(`AI ${player.name} failed initial arrangement. Using fallback.`);
          const fallbackTou = player.hand.slice(0, 3);
          const fallbackZhong = player.hand.slice(3, 8);
          const fallbackWei = player.hand.slice(8, 13);
          if (fallbackTou.length === 3 && fallbackZhong.length === 5 && fallbackWei.length === 5 && isValidArrangementLogic(fallbackTou, fallbackZhong, fallbackWei)) {
            return {
              ...player,
              arranged: { tou: fallbackTou, zhong: fallbackZhong, wei: fallbackWei },
              evalHands: {
                tou: evaluateHandLogic(fallbackTou),
                zhong: evaluateHandLogic(fallbackZhong),
                wei: evaluateHandLogic(fallbackWei),
              },
              confirmed: true
            };
          }
          return { ...player, arranged: { tou: [], zhong: [], wei: [] }, evalHands: null, confirmed: true };
        }
      } else { // For Human player
        humanHandForAISuggestion = [...player.hand]; // Store human's hand to get an AI suggestion
        return player; // Return human player object (hand dealt, not yet arranged in UI)
      }
    });

    // Generate an initial AI arrangement for the human player
    if (humanHandForAISuggestion.length === 13) {
      const initialHumanAIArrangement = arrangeCardsAILogic(humanHandForAISuggestion);
      if (initialHumanAIArrangement && isValidArrangementLogic(initialHumanAIArrangement.tou, initialHumanAIArrangement.zhong, initialHumanAIArrangement.wei)) {
        setArrangedHumanHand(initialHumanAIArrangement);
      } else {
        // Fallback if AI can't arrange human's hand (should be rare)
        console.error("AI failed to provide initial arrangement for human. Placing all in tou.");
        setArrangedHumanHand({ tou: humanHandForAISuggestion, zhong: [], wei: [] });
      }
    } else {
        // Should not happen if startGameLogic works correctly
        setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    }

    newState.gameState = "HUMAN_ARRANGING";
    setGameState(newState);
  }, []);

  useEffect(() => {
    if (gameState.gameState === GameStates.INIT) {
      initializeNewGame();
    }
  }, [gameState.gameState, initializeNewGame]);


  const handleSubmitPlayerHand = useCallback(() => {
    if (!humanPlayerFromState) return;
    const { tou, zhong, wei } = arrangedHumanHand;

    const totalCardsInDuns = tou.length + zhong.length + wei.length;
    if (totalCardsInDuns !== 13) {
      alert(`总牌数必须是13张，当前为 ${totalCardsInDuns} 张。请检查各墩牌数。`);
      return;
    }
    if (tou.length !== 3 || zhong.length !== 5 || wei.length !== 5) {
      alert(`墩牌数量不正确！\n头道需3张 (当前${tou.length}张)\n中道需5张 (当前${zhong.length}张)\n尾道需5张 (当前${wei.length}张)`);
      return;
    }
    if (!isValidArrangementLogic(tou, zhong, wei)) {
      alert("您的墩牌不合法！请确保头道 ≤ 中道 ≤ 尾道。");
      return;
    }

    let stateAfterHumanConfirm = confirmPlayerArrangementLogic(gameState, humanPlayerFromState.id, arrangedHumanHand);
    const finalStateWithResults = compareAllHandsLogic(stateAfterHumanConfirm);
    setGameState(finalStateWithResults);
    setShowComparisonModal(true);
  }, [humanPlayerFromState, arrangedHumanHand, gameState]);


  const handleAIHelperForHuman = useCallback(() => {
    const humanP = gameState.players.find(p => p.isHuman);
    if (humanP && humanP.hand && humanP.hand.length === 13) {
      const suggestion = arrangeCardsAILogic(humanP.hand);
      if (suggestion && isValidArrangementLogic(suggestion.tou, suggestion.zhong, suggestion.wei)) {
        setArrangedHumanHand(suggestion);
        setSelectedCardInfo(null); // Clear any card selection
      } else {
        alert("AI未能给出新的有效分牌建议。");
      }
    }
  }, [gameState.players]);


  const handleCardClick = useCallback((cardClicked, currentDunOfCard) => {
    if (!selectedCardInfo) {
      setSelectedCardInfo({ card: cardClicked, fromDun: currentDunOfCard });
    } else {
      if (selectedCardInfo.card.id === cardClicked.id && selectedCardInfo.fromDun === currentDunOfCard) {
        setSelectedCardInfo(null); // Clicked same selected card: deselect
      } else {
        // A card is selected, and user clicks a DIFFERENT card in some dun.
        // This action now means: "I want to select this NEW card instead."
        setSelectedCardInfo({ card: cardClicked, fromDun: currentDunOfCard });
      }
    }
  }, [selectedCardInfo]);

  const handleDunClick = useCallback((targetDunName) => {
    if (selectedCardInfo) { // If a card is selected, move it to this dun (targetDunName)
      const { card, fromDun } = selectedCardInfo;

      // Prevent moving to the same dun if it's already there (no actual move)
      // but if the card was selected from this dun, clicking the dun again should deselect.
      if (fromDun === targetDunName) {
        setSelectedCardInfo(null); // Deselect if clicking the dun the card is already in
        return;
      }

      setArrangedHumanHand(prev => {
        const newArrangement = {
          tou: [...prev.tou],
          zhong: [...prev.zhong],
          wei: [...prev.wei],
        };

        // Remove card from its original dun (fromDun)
        if (fromDun && newArrangement[fromDun]) { // Check if fromDun is valid key
          newArrangement[fromDun] = newArrangement[fromDun].filter(c => c.id !== card.id);
        }
        
        // Add card to the target dun, ensuring no duplicates
        if (newArrangement[targetDunName] && !newArrangement[targetDunName].find(c => c.id === card.id)) {
            newArrangement[targetDunName] = [...newArrangement[targetDunName], card];
        } else if (!newArrangement[targetDunName]) { // Should not happen if duns are initialized
            newArrangement[targetDunName] = [card];
        }


        return newArrangement;
      });
      setSelectedCardInfo(null); // Clear selection after moving
    }
    // If no card is selected, clicking a dun area does nothing.
  }, [selectedCardInfo]);

  if (gameState.gameState === GameStates.INIT) {
     return <div className="app-loading">请稍候，游戏正在初始化...</div>;
  }

  const currentStatusText = GameStateDisplayNames[gameState.gameState] || "进行中...";
  const playerNames = gameState.players.map(p => p.name).join('、');

  return (
    <div className="app-container">
      {!showComparisonModal && humanPlayerFromState && (
        <>
          <TopInfoBar statusText={currentStatusText} playerNames={playerNames} />
          <div className="game-content-area">
            <HumanPlayerBoard
              arrangedHand={arrangedHumanHand} // This contains the human's current arrangement
              selectedCardInfo={selectedCardInfo}
              onCardClick={handleCardClick}
              onDunClick={handleDunClick}
            />
          </div>
          <ActionButtons
            onAIHelper={handleAIHelperForHuman}
            onSubmit={handleSubmitPlayerHand}
            canSubmit={
                (arrangedHumanHand.tou.length + arrangedHumanHand.zhong.length + arrangedHumanHand.wei.length) === 13
            }
          />
        </>
      )}

      {showComparisonModal && (
        <ComparisonModal
          players={gameState.players}
          onClose={() => {
            setShowComparisonModal(false);
            setGameState(prev => ({
                ...initialGameState,
                players: prev.players.map(p => ({
                    ...initialGameState.players.find(ip => ip.id === p.id),
                    id: p.id,
                    name: p.name,
                    isHuman: p.isHuman,
                    score: p.score,
                    hand: [],
                    arranged: { tou: [], zhong: [], wei: [] },
                    evalHands: null,
                    confirmed: false,
                 })),
                gameState: GameStates.INIT
            }));
          }}
        />
      )}
      {!showComparisonModal && !humanPlayerFromState && gameState.gameState === "HUMAN_ARRANGING" && (
          <div className="app-loading">正在加载玩家数据...</div>
      )}
    </div>
  );
}

export default App;
