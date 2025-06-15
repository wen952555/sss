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
  const [selectedCardsInfo, setSelectedCardsInfo] = useState([]);

  const humanPlayerFromState = gameState.players.find(p => p.isHuman);

  const initializeNewGame = useCallback(() => {
    setShowComparisonModal(false);
    setSelectedCardsInfo([]);
    setArrangedHumanHand({ tou: [], zhong: [], wei: [] });

    let newState = startGameLogic(initialGameState);
    let humanHandForAISuggestion = [];

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
          console.error(`AI ${player.name} failed initial arrangement. Using fallback.`);
          const fallbackTou = player.hand.slice(0, 3);
          const fallbackZhong = player.hand.slice(3, 8);
          const fallbackWei = player.hand.slice(8, 13);
          // Ensure fallback arrangement is valid (3,5,5) before evaluating
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
          // If even the slice fallback is not 3,5,5 (e.g. player.hand < 13, which shouldn't happen)
          // or not valid, provide a default evaluated structure for empty/invalid hands.
          const emptyArrangement = { tou: [], zhong: [], wei: [] };
          return {
            ...player,
            arranged: emptyArrangement,
            evalHands: { // *** CRITICAL CHANGE HERE ***
              tou: evaluateHandLogic(emptyArrangement.tou),
              zhong: evaluateHandLogic(emptyArrangement.zhong),
              wei: evaluateHandLogic(emptyArrangement.wei),
            },
            confirmed: true
          };
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
    if (totalCardsInDuns !== 13) { alert(`总牌数必须是13张，当前为 ${totalCardsInDuns} 张。请检查各墩牌数。`); return; }
    if (tou.length !== 3 || zhong.length !== 5 || wei.length !== 5) { alert(`墩牌数量不正确！\n头道需3张 (当前${tou.length}张)\n中道需5张 (当前${zhong.length}张)\n尾道需5张 (当前${wei.length}张)`); return; }
    if (!isValidArrangementLogic(tou, zhong, wei)) { alert("您的墩牌不合法！请确保头道 ≤ 中道 ≤ 尾道。"); return; }

    let stateAfterHumanConfirm = confirmPlayerArrangementLogic(gameState, humanPlayerFromState.id, arrangedHumanHand);
    const finalStateWithResults = compareAllHandsLogic(stateAfterHumanConfirm); // This is where the error likely originates if evalHands are bad
    setGameState(finalStateWithResults);
    setShowComparisonModal(true);
  }, [humanPlayerFromState, arrangedHumanHand, gameState]);


  const handleAIHelperForHuman = useCallback(() => {
    const humanP = gameState.players.find(p => p.isHuman);
    if (humanP && humanP.hand && humanP.hand.length === 13) {
      const suggestion = arrangeCardsAILogic(humanP.hand);
      if (suggestion && isValidArrangementLogic(suggestion.tou, suggestion.zhong, suggestion.wei)) {
        setArrangedHumanHand(suggestion);
        setSelectedCardsInfo([]);
      } else {
        alert("AI未能给出新的有效分牌建议。");
      }
    }
  }, [gameState.players]);


  const handleCardClick = useCallback((cardClicked, currentDunOfCard) => {
    setSelectedCardsInfo(prevSelected => {
      const existingIndex = prevSelected.findIndex(info => info.card.id === cardClicked.id);
      if (existingIndex > -1) {
        return prevSelected.filter((_, index) => index !== existingIndex);
      } else {
        return [...prevSelected, { card: cardClicked, fromDun: currentDunOfCard }];
      }
    });
  }, []);

  const handleDunClick = useCallback((targetDunName) => {
    if (selectedCardsInfo.length > 0) {
      setArrangedHumanHand(prevArrangement => {
        const newArrangement = {
          tou: [...prevArrangement.tou],
          zhong: [...prevArrangement.zhong],
          wei: [...prevArrangement.wei],
        };
        const cardsToAddToTarget = [];
        selectedCardsInfo.forEach(selectedInfo => {
          const { card, fromDun } = selectedInfo;
          if (fromDun && newArrangement[fromDun]) {
            newArrangement[fromDun] = newArrangement[fromDun].filter(c => c.id !== card.id);
          }
          cardsToAddToTarget.push(card);
        });
        const existingTargetDunCardIds = new Set(newArrangement[targetDunName].map(c=>c.id));
        const uniqueCardsToAdd = cardsToAddToTarget.filter(c => !existingTargetDunCardIds.has(c.id));
        newArrangement[targetDunName] = [...newArrangement[targetDunName], ...uniqueCardsToAdd];
        return newArrangement;
      });
      setSelectedCardsInfo([]);
    }
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
              selectedCardsInfo={selectedCardsInfo}
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
