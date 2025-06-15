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
  HUMAN_ARRANGING: "请您调整牌型",
  [GameStates.RESULTS]: "查看结果",
};

function App() {
  const [gameState, setGameState] = useState(initialGameState);
  const [arrangedHumanHand, setArrangedHumanHand] = useState({ tou: [], zhong: [], wei: [] });
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  // selectedCardsInfo is now an array: [{ card: CardObject, fromDun: string }, ...]
  const [selectedCardsInfo, setSelectedCardsInfo] = useState([]);

  const humanPlayerFromState = gameState.players.find(p => p.isHuman);

  const initializeNewGame = useCallback(() => {
    setShowComparisonModal(false);
    setSelectedCardsInfo([]); // Reset to empty array
    setArrangedHumanHand({ tou: [], zhong: [], wei: [] });

    let newState = startGameLogic(initialGameState);
    let humanHandForAISuggestion = [];

    newState.players = newState.players.map(player => {
      if (!player.isHuman) {
        const aiArrangement = arrangeCardsAILogic(player.hand);
        if (aiArrangement && isValidArrangementLogic(aiArrangement.tou, aiArrangement.zhong, aiArrangement.wei)) {
          const evalHands = { /* ... evaluate AI hands ... */ };
          return { ...player, arranged: aiArrangement, evalHands, confirmed: true };
        } else {
          // AI fallback arrangement
          console.error(`AI ${player.name} fallback arrangement on init.`);
          const fallbackTou = player.hand.slice(0, 3);
          const fallbackZhong = player.hand.slice(3, 8);
          const fallbackWei = player.hand.slice(8, 13);
          if (fallbackTou.length === 3 && fallbackZhong.length === 5 && fallbackWei.length === 5 && isValidArrangementLogic(fallbackTou, fallbackZhong, fallbackWei)) {
            return {
              ...player,
              arranged: { tou: fallbackTou, zhong: fallbackZhong, wei: fallbackWei },
              evalHands: { tou: evaluateHandLogic(fallbackTou), zhong: evaluateHandLogic(fallbackZhong), wei: evaluateHandLogic(fallbackWei) },
              confirmed: true
            };
          }
          return { ...player, arranged: { tou: [], zhong: [], wei: [] }, evalHands: null, confirmed: true };
        }
      } else {
        humanHandForAISuggestion = [...player.hand];
        return player;
      }
    });

    if (humanHandForAISuggestion.length === 13) {
      const initialHumanAIArrangement = arrangeCardsAILogic(humanHandForAISuggestion);
      if (initialHumanAIArrangement && isValidArrangementLogic(initialHumanAIArrangement.tou, initialHumanAIArrangement.zhong, initialHumanAIArrangement.wei)) {
        setArrangedHumanHand(initialHumanAIArrangement);
      } else {
        console.error("AI failed to provide initial arrangement for human. Placing all in tou.");
        setArrangedHumanHand({ tou: humanHandForAISuggestion, zhong: [], wei: [] });
      }
    } else {
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
    if (totalCardsInDuns !== 13) { /* ... alert ... */ return; }
    if (tou.length !== 3 || zhong.length !== 5 || wei.length !== 5) { /* ... alert ... */ return; }
    if (!isValidArrangementLogic(tou, zhong, wei)) { /* ... alert ... */ return; }

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
        setSelectedCardsInfo([]); // Clear selection
      } else {
        alert("AI未能给出新的有效分牌建议。");
      }
    }
  }, [gameState.players]);

  // Card interaction logic for multi-select
  const handleCardClick = useCallback((cardClicked, currentDunOfCard) => {
    setSelectedCardsInfo(prevSelected => {
      const existingIndex = prevSelected.findIndex(info => info.card.id === cardClicked.id);
      if (existingIndex > -1) {
        // Card is already selected, remove it (deselect)
        return prevSelected.filter((_, index) => index !== existingIndex);
      } else {
        // Card is not selected, add it
        return [...prevSelected, { card: cardClicked, fromDun: currentDunOfCard }];
      }
    });
  }, []);

  const handleDunClick = useCallback((targetDunName) => {
    if (selectedCardsInfo.length > 0) { // If there are selected cards
      setArrangedHumanHand(prevArrangement => {
        const newArrangement = {
          tou: [...prevArrangement.tou],
          zhong: [...prevArrangement.zhong],
          wei: [...prevArrangement.wei],
        };

        // Cards to be added to the target dun
        const cardsToAddToTarget = [];

        selectedCardsInfo.forEach(selectedInfo => {
          const { card, fromDun } = selectedInfo;
          // Remove card from its original dun
          if (fromDun && newArrangement[fromDun]) {
            newArrangement[fromDun] = newArrangement[fromDun].filter(c => c.id !== card.id);
          }
          // Add to our temporary list for the target dun
          cardsToAddToTarget.push(card);
        });
        
        // Add all selected cards to the target dun, ensuring no duplicates within the additions
        // and also not re-adding if a card was already in targetDun (though filter should handle this)
        const existingTargetDunCardIds = new Set(newArrangement[targetDunName].map(c=>c.id));
        const uniqueCardsToAdd = cardsToAddToTarget.filter(c => !existingTargetDunCardIds.has(c.id));

        newArrangement[targetDunName] = [...newArrangement[targetDunName], ...uniqueCardsToAdd];
        
        return newArrangement;
      });
      setSelectedCardsInfo([]); // Clear selection after moving
    }
    // If no cards are selected, clicking a dun area does nothing.
  }, [selectedCardsInfo]);


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
              arrangedHand={arrangedHumanHand}
              selectedCardsInfo={selectedCardsInfo} // Pass array of selected cards
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
                    id: p.id, name: p.name, isHuman: p.isHuman, score: p.score,
                    hand: [], arranged: { tou: [], zhong: [], wei: [] },
                    evalHands: null, confirmed: false,
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
