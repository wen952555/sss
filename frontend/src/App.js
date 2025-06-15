// frontend_react/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import TopInfoBar from './components/TopInfoBar';
import HumanPlayerBoard from './components/HumanPlayerBoard';
import ActionButtons from './components/ActionButtons';
import ComparisonModal from './components/ComparisonModal';
import { initialGameState, startGame, confirmArrangement as confirmPlayerArrangementLogic, compareAllHands, GameStates, isValidArrangement } from './logic/gameLogic';
import { arrangeCardsAI } from './logic/aiLogic';
import { evaluateHand } from './logic/cardUtils'; // evaluateHand需要单独导入
import './App.css'; // 全局App样式

// eslint-disable-next-line no-unused-vars
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://wenge.cloudns.ch/api'
  : 'http://localhost:8000/api';

const GameStateDisplayNames = { // 用于TopInfoBar显示
  [GameStates.INIT]: "准备开始",
  [GameStates.DEALING]: "发牌中...",
  HUMAN_ARRANGING: "请您分牌", // 自定义状态名
  [GameStates.COMPARING]: "比牌中...", // 可能直接跳到RESULTS
  [GameStates.RESULTS]: "查看结果",
  // GAME_OVER: "游戏结束" // 如果有明确的结束状态
};

function App() {
  const [gameState, setGameState] = useState(initialGameState);
  // arrangedHumanHand 用于暂存人类玩家在UI上摆放的牌
  const [arrangedHumanHand, setArrangedHumanHand] = useState({ tou: [], zhong: [], wei: [] });
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedCardFromHand, setSelectedCardFromHand] = useState(null); // 用于点击选牌逻辑

  const humanPlayer = gameState.players.find(p => p.isHuman);
  const humanPlayerId = humanPlayer?.id;

  // --- 游戏流程控制 ---
  const handleStartGame = useCallback(() => {
    setShowComparisonModal(false);
    setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    setSelectedCardFromHand(null);

    let newState = startGame(initialGameState); // 发牌，返回包含已发手牌的状态

    // AI 自动分牌并"确认" (在state中更新它们的墩牌和评估结果)
    newState.players = newState.players.map(player => {
      if (!player.isHuman) {
        const aiArrangement = arrangeCardsAI(player.hand);
        if (aiArrangement && isValidArrangement(aiArrangement.tou, aiArrangement.zhong, aiArrangement.wei)) {
          const evalHands = {
            tou: evaluateHand(aiArrangement.tou),
            zhong: evaluateHand(aiArrangement.zhong),
            wei: evaluateHand(aiArrangement.wei),
          };
          // AI直接确认，它们不需要UI交互来摆牌
          return { ...player, arranged: aiArrangement, evalHands, confirmed: true };
        } else {
          console.error(`AI ${player.name} failed to arrange cards or arranged invalidly.`);
          // 必须给一个状态，否则流程可能卡住
          // 这里给一个空的但合法的墩牌，并标记为已确认
          const emptyArrangement = { tou: [], zhong: [], wei: [] }; // 不合法，仅为示例
          // 更好的做法是，如果AI分牌失败，应该有一个重试或默认策略
          // 为了流程继续，暂时标记AI已确认，但牌是空的（这会导致AI输）
           const fallbackTou = player.hand.slice(0,3);
           const fallbackZhong = player.hand.slice(3,8);
           const fallbackWei = player.hand.slice(8,13);

           if (isValidArrangement(fallbackTou, fallbackZhong, fallbackWei)) {
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
            // 极度回退，如果连最简单的顺序分牌都不合法（理论上不应该）
             return { ...player, arranged: {tou: [], zhong: [], wei: []}, evalHands: null, confirmed: true };
           }
        }
      }
      return player;
    });
    newState.gameState = "HUMAN_ARRANGING"; // 自定义状态，表示等待人类玩家摆牌
    setGameState(newState);
  }, []); // startGame, arrangeCardsAI, isValidArrangement, evaluateHand 都是外部导入的稳定函数

  const handleSubmitPlayerHand = useCallback(() => {
    if (!humanPlayer) return;

    // 检查人类玩家的墩牌是否完整
    const { tou, zhong, wei } = arrangedHumanHand;
    if (tou.length !== 3 || zhong.length !== 5 || wei.length !== 5) {
      alert("请将所有13张牌分入三墩！");
      return;
    }
    if (!isValidArrangement(tou, zhong, wei)) {
      alert("您的墩牌不合法！请确保头道 ≤ 中道 ≤ 尾道。");
      return;
    }

    // 更新游戏状态中人类玩家的牌墩和确认状态
    let stateAfterHumanConfirm = confirmPlayerArrangementLogic(gameState, humanPlayer.id, arrangedHumanHand);

    // 此时所有玩家（AI已自动确认，人类玩家手动确认）都已完成摆牌
    // 进行比牌
    const finalStateWithResults = compareAllHands(stateAfterHumanConfirm);
    setGameState(finalStateWithResults); // 更新 gameState 以包含最终得分和结果状态
    setShowComparisonModal(true); // 显示比牌结果模态框

  }, [humanPlayer, arrangedHumanHand, gameState, confirmPlayerArrangementLogic, compareAllHands, isValidArrangement]);


  const handleAIHelperForHuman = useCallback(() => {
    if (humanPlayer && humanPlayer.hand.length === 13) {
      const suggestion = arrangeCardsAI(humanPlayer.hand);
      if (suggestion && isValidArrangement(suggestion.tou, suggestion.zhong, suggestion.wei)) {
        setArrangedHumanHand(suggestion);
        // 清空手牌区选中状态（如果实现方式需要）
        setSelectedCardFromHand(null);
      } else {
        alert("AI未能给出有效的分牌建议。");
      }
    }
  }, [humanPlayer, arrangeCardsAI, isValidArrangement]);


  // --- 人类玩家理牌交互逻辑 (点击版本) ---
  const getUnassignedCards = useCallback(() => {
    if (!humanPlayer) return [];
    const assignedIds = new Set([
      ...arrangedHumanHand.tou.map(c => c.id),
      ...arrangedHumanHand.zhong.map(c => c.id),
      ...arrangedHumanHand.wei.map(c => c.id),
    ]);
    return humanPlayer.hand.filter(card => !assignedIds.has(card.id));
  }, [humanPlayer, arrangedHumanHand]);

  const handleSelectCardFromPlayerHand = useCallback((card) => {
    setSelectedCardFromHand(prev => (prev && prev.id === card.id ? null : card)); // 点击同一张卡取消选择
  }, []);

  const handlePlaceCardInDun = useCallback((dunName) => {
    if (!selectedCardFromHand) return; // 没有选中手牌则不操作

    setArrangedHumanHand(prevArrangement => {
      const newArrangement = { ...prevArrangement };
      const dun = [...newArrangement[dunName]];
      const dunMaxSize = dunName === 'tou' ? 3 : 5;

      if (dun.length < dunMaxSize) {
        // 从其他墩移除这张牌（如果它之前在别的墩，虽然此逻辑下它应该在未分配区）
        Object.keys(newArrangement).forEach(key => {
            if (key !== dunName) {
                newArrangement[key] = newArrangement[key].filter(c => c.id !== selectedCardFromHand.id);
            }
        });
        // 添加到目标墩
        newArrangement[dunName] = [...dun, selectedCardFromHand];
        setSelectedCardFromHand(null); // 放置后取消选中
      } else {
        alert(`${dunName.toUpperCase()}道已满！`);
      }
      return newArrangement;
    });
  }, [selectedCardFromHand]);

  const handleRemoveCardFromDun = useCallback((card, dunName) => {
    setArrangedHumanHand(prevArrangement => {
      const newArrangement = { ...prevArrangement };
      newArrangement[dunName] = newArrangement[dunName].filter(c => c.id !== card.id);
      // 卡牌返回未分配区，不需要setSelectedCardFromHand，它会自动出现在未分配列表
      return newArrangement;
    });
    // 如果之前选中的牌就是这个被移除的牌，清空选中
    if (selectedCardFromHand && selectedCardFromHand.id === card.id) {
        setSelectedCardFromHand(null);
    }
  }, [selectedCardFromHand]);


  // --- 渲染 ---
  const currentStatusText = GameStateDisplayNames[gameState.gameState] || "进行中...";
  const playerNames = gameState.players.map(p => p.name).join('、');

  // 初始加载时自动开始游戏
  useEffect(() => {
    if (gameState.gameState === GameStates.INIT) {
      handleStartGame();
    }
  }, [gameState.gameState, handleStartGame]);


  if (gameState.gameState === GameStates.INIT) {
    return <div className="app-loading">正在准备游戏...</div>; // 或者一个开始按钮
  }

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
          players={gameState.players} // 传递带有最终已确认牌墩的玩家数据
          onClose={() => {
            setShowComparisonModal(false);
            // 这里可以重置游戏状态到INIT，让useEffect自动开始新游戏
            setGameState(prev => ({...prev, gameState: GameStates.INIT}));
          }}
        />
      )}
    </div>
  );
}

export default App;
