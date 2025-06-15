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
  const [arrangedHumanHand, setArrangedHumanHand] = useState({ tou: [], zhong: [], wei: [] });
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedCardInfo, setSelectedCardInfo] = useState(null); // { card: CardObject, fromDun: string }

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
          console.error(`AI ${player.name} fallback arrangement.`);
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
      } else {
        setArrangedHumanHand({
            tou: [...player.hand],
            zhong: [],
            wei: []
        });
      }
      return player;
    });
    newState.gameState = "HUMAN_ARRANGING";
    setGameState(newState);
  }, []);

  const handleSubmitPlayerHand = useCallback(() => {
    if (!humanPlayer) return;
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


  const handleCardClick = useCallback((cardClicked, currentDunOfCard) => {
    if (!selectedCardInfo) {
      setSelectedCardInfo({ card: cardClicked, fromDun: currentDunOfCard });
    } else {
      if (selectedCardInfo.card.id === cardClicked.id && selectedCardInfo.fromDun === currentDunOfCard) {
        setSelectedCardInfo(null);
      } else {
        setSelectedCardInfo({ card: cardClicked, fromDun: currentDunOfCard });
      }
    }
  }, [selectedCardInfo]);

  const handleDunClick = useCallback((targetDunName) => {
    if (selectedCardInfo) {
      const { card, fromDun } = selectedCardInfo;

      if (fromDun === targetDunName) {
        setSelectedCardInfo(null);
        return;
      }

      setArrangedHumanHand(prev => {
        const newArrangement = {
          tou: [...prev.tou],
          zhong: [...prev.zhong],
          wei: [...prev.wei],
        };

        if (fromDun) {
          newArrangement[fromDun] = newArrangement[fromDun].filter(c => c.id !== card.id);
        }
        
        if (!newArrangement[targetDunName].find(c => c.id === card.id)) {
            newArrangement[targetDunName] = [...newArrangement[targetDunName], card];
        }

        return newArrangement;
      });
      setSelectedCardInfo(null);
    }
  }, [selectedCardInfo]);


  useEffect(() => {
    if (gameState.gameState === GameStates.INIT) {
      const human = gameState.players.find(p => p.isHuman);
      if (!human || !human.hand || human.hand.length === 0) {
         handleStartGame();
      }
    }
  }, [gameState.gameState, gameState.players, handleStartGame]);


  if (gameState.gameState === GameStates.INIT && !gameState.players.find(p=>p.isHuman)?.hand?.length) {
     return <div className="app-loading">正在准备新一局...</div>;
  }

  const currentStatusText = GameStateDisplayNames[gameState.gameState] || "进行中...";
  const playerNames = gameState.players.map(p => p.name).join('、');

  return (
    <div className="app-container">
      {!showComparisonModal && humanPlayer && (
        <>
          <TopInfoBar statusText={currentStatusText} playerNames={playerNames} />
          <div className="game-content-area">
            <HumanPlayerBoard
              arrangedHand={arrangedHumanHand}
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
    </div>
  );
} // This closing curly brace was missing or misplaced, causing the syntax error.

export default App;
