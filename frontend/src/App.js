// frontend_react/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import TopInfoBar from './components/TopInfoBar';
import HumanPlayerBoard from './components/HumanPlayerBoard';
import ActionButtons from './components/ActionButtons';
import ComparisonModal from './components/ComparisonModal';
// 从 gameLogic 导入的函数和常量
import {
  initialGameState,
  startGame,
  confirmArrangement as confirmPlayerArrangementLogic,
  compareAllHands,
  GameStates
} from './logic/gameLogic';
// 从 aiLogic 导入
import { arrangeCardsAI } from './logic/aiLogic';
// 从 cardUtils 导入的函数和常量
import {
  evaluateHand,
  isValidArrangement // <--- *** 修改在这里 ***
} from './logic/cardUtils';
import './App.css'; // 全局App样式

// eslint-disable-next-line no-unused-vars
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://wenge.cloudns.ch/api'
  : 'http://localhost:8000/api';

const GameStateDisplayNames = { // 用于TopInfoBar显示
  [GameStates.INIT]: "准备开始",
  [GameStates.DEALING]: "发牌中...",
  HUMAN_ARRANGING: "请您分牌", // 自定义状态名
  [GameStates.COMPARING]: "比牌中...",
  [GameStates.RESULTS]: "查看结果",
};

function App() {
  const [gameState, setGameState] = useState(initialGameState);
  const [arrangedHumanHand, setArrangedHumanHand] = useState({ tou: [], zhong: [], wei: [] });
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedCardFromHand, setSelectedCardFromHand] = useState(null);

  const humanPlayer = gameState.players.find(p => p.isHuman);
  // const humanPlayerId = humanPlayer?.id; // humanPlayerId 在这个版本中没有直接使用，可以注释掉

  const handleStartGame = useCallback(() => {
    setShowComparisonModal(false);
    // setComparisonData(null); // comparisonData 在这个版本中没有使用，可以注释掉
    setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    setSelectedCardFromHand(null);

    let newState = startGame(initialGameState);

    newState.players = newState.players.map(player => {
      if (!player.isHuman) {
        const aiArrangement = arrangeCardsAI(player.hand);
        if (aiArrangement && isValidArrangement(aiArrangement.tou, aiArrangement.zhong, aiArrangement.wei)) {
          const evalHands = {
            tou: evaluateHand(aiArrangement.tou),
            zhong: evaluateHand(aiArrangement.zhong),
            wei: evaluateHand(aiArrangement.wei),
          };
          return { ...player, arranged: aiArrangement, evalHands, confirmed: true };
        } else {
          console.error(`AI ${player.name} failed to arrange cards or arranged invalidly.`);
           const fallbackTou = player.hand.slice(0,3);
           const fallbackZhong = player.hand.slice(3,8);
           const fallbackWei = player.hand.slice(8,13);

           if (fallbackTou.length === 3 && fallbackZhong.length === 5 && fallbackWei.length === 5 && isValidArrangement(fallbackTou, fallbackZhong, fallbackWei)) {
             return {
                ...player,
                arranged: {tou: fallbackTou, zhong: fallbackZhong, wei: fallbackWei},
                evalHands: {
                    tou: evaluateHand(fallbackTou),
                    zhong: evaluateHand(fallbackZhong),
                    wei: evaluateHand(fallbackWei),
                },
                confirmed: true
             }
           } else {
             return { ...player, arranged: {tou: [], zhong: [], wei: []}, evalHands: null, confirmed: true };
           }
        }
      }
      return player;
    });
    newState.gameState = "HUMAN_ARRANGING";
    setGameState(newState);
  }, [startGame, arrangeCardsAI, isValidArrangement, evaluateHand]); // 将外部函数作为依赖加入

  const handleSubmitPlayerHand = useCallback(() => {
    if (!humanPlayer) return;

    const { tou, zhong, wei } = arrangedHumanHand;
    if (tou.length !== 3 || zhong.length !== 5 || wei.length !== 5) {
      alert("请将所有13张牌分入三墩！");
      return;
    }
    if (!isValidArrangement(tou, zhong, wei)) {
      alert("您的墩牌不合法！请确保头道 ≤ 中道 ≤ 尾道。");
      return;
    }

    let stateAfterHumanConfirm = confirmPlayerArrangementLogic(gameState, humanPlayer.id, arrangedHumanHand);
    const finalStateWithResults = compareAllHands(stateAfterHumanConfirm);
    setGameState(finalStateWithResults);
    setShowComparisonModal(true);

  }, [humanPlayer, arrangedHumanHand, gameState, confirmPlayerArrangementLogic, compareAllHands, isValidArrangement]);


  const handleAIHelperForHuman = useCallback(() => {
    if (humanPlayer && humanPlayer.hand.length === 13) {
      const suggestion = arrangeCardsAI(humanPlayer.hand);
      if (suggestion && isValidArrangement(suggestion.tou, suggestion.zhong, suggestion.wei)) {
        setArrangedHumanHand(suggestion);
        setSelectedCardFromHand(null);
      } else {
        alert("AI未能给出有效的分牌建议。");
      }
    }
  }, [humanPlayer, arrangeCardsAI, isValidArrangement]);


  const getUnassignedCards = useCallback(() => {
    if (!humanPlayer) return [];
    const assignedIds = new Set([
      ...arrangedHumanHand.tou.map(c => c.id),
      ...arrangedHumanHand.zhong.map(c => c.id),
      ...arrangedHumanHand.wei.map(c => c.id),
    ]);
    // 确保 humanPlayer.hand 存在
    return (humanPlayer.hand || []).filter(card => !assignedIds.has(card.id));
  }, [humanPlayer, arrangedHumanHand]);

  const handleSelectCardFromPlayerHand = useCallback((card) => {
    setSelectedCardFromHand(prev => (prev && prev.id === card.id ? null : card));
  }, []);

  const handlePlaceCardInDun = useCallback((dunName) => {
    if (!selectedCardFromHand) return;

    setArrangedHumanHand(prevArrangement => {
      const newArrangement = { ...prevArrangement };
      // 从所有墩中移除这张牌，以防它之前被放在别的墩
      Object.keys(newArrangement).forEach(key => {
          newArrangement[key] = (newArrangement[key] || []).filter(c => c.id !== selectedCardFromHand.id);
      });

      const dun = [...(newArrangement[dunName] || [])]; // 获取最新的墩牌数组
      const dunMaxSize = dunName === 'tou' ? 3 : 5;

      if (dun.length < dunMaxSize) {
        newArrangement[dunName] = [...dun, selectedCardFromHand];
        setSelectedCardFromHand(null);
      } else {
        alert(`${dunName.toUpperCase()}道已满！`);
      }
      return newArrangement;
    });
  }, [selectedCardFromHand]);

  const handleRemoveCardFromDun = useCallback((card, dunName) => {
    setArrangedHumanHand(prevArrangement => {
      const newArrangement = { ...prevArrangement };
      newArrangement[dunName] = (newArrangement[dunName] || []).filter(c => c.id !== card.id);
      return newArrangement;
    });
    if (selectedCardFromHand && selectedCardFromHand.id === card.id) {
        setSelectedCardFromHand(null);
    }
  }, [selectedCardFromHand]);

  useEffect(() => {
    if (gameState.gameState === GameStates.INIT) {
      handleStartGame();
    }
  }, [gameState.gameState, handleStartGame]);


  if (gameState.gameState === GameStates.INIT && !humanPlayer) { // 确保humanPlayer已定义才渲染
    return <div className="app-loading">正在准备游戏...</div>;
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
              player={humanPlayer}
              unassignedCards={getUnassignedCards()}
              arrangedHand={arrangedHumanHand}
              selectedCardId={selectedCardFromHand?.id}
              onSelectCardFromHand={handleSelectCardFromPlayerHand}
              onPlaceCardInDun={handlePlaceCardInDun}
              onRemoveCardFromDun={handleRemoveCardFromDun}
            />
          </div>
          <ActionButtons
            onAIHelper={handleAIHelperForHuman}
            onSubmit={handleSubmitPlayerHand}
            canSubmit={
                arrangedHumanHand.tou.length === 3 &&
                arrangedHumanHand.zhong.length === 5 &&
                arrangedHumanHand.wei.length === 5
            }
          />
        </>
      )}

      {showComparisonModal && gameState.roundResults && (
        <ComparisonModal
          results={gameState.roundResults}
          players={gameState.players}
          onClose={() => {
            setShowComparisonModal(false);
            setGameState(prev => ({...initialGameState, players: prev.players.map(p => ({...p, score: p.score})), gameState: GameStates.INIT})); // 保留分数开始新局
          }}
        />
      )}
    </div>
  );
}

export default App;
