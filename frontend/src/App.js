// frontend_react/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import Board from './components/Board';
import { initialGameState, startGame, confirmArrangement, compareAllHands, GameStates } from './logic/gameLogic';
import { arrangeCardsAI } from './logic/aiLogic';
import './App.css';

// 后端 API 地址
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://wenge.cloudns.ch/api' // 您的 Serv00 后端API地址 (无端口)
  : 'http://localhost:8000/api'; // 本地PHP开发服务器 (如果使用)


function App() {
  const [gameState, setGameState] = useState(initialGameState);
  const [selectedCards, setSelectedCards] = useState([]);
  const [arrangedHumanHand, setArrangedHumanHand] = useState({ tou: [], zhong: [], wei: [] });

  const humanPlayerId = gameState.players.find(p => p.isHuman)?.id || 'player1';

  // AI 自动分牌
  // 这个useEffect的目的是：当游戏进入ARRANGING状态，或者gameState.players数组引用发生变化时，
  // 检查AI玩家是否需要分牌，如果需要则进行分牌，并更新游戏状态以确认AI的牌。
  useEffect(() => {
    // 只在ARRANGING状态下执行AI逻辑
    if (gameState.gameState === GameStates.ARRANGING) {
      let anyAIArrangedThisTurn = false;
      const currentPlayers = gameState.players; // 从当前gameState中获取players

      const newPlayersStateAfterAI = currentPlayers.map(player => {
        if (!player.isHuman && !player.confirmed && player.hand.length === 13) {
          const aiArrangement = arrangeCardsAI(player.hand);
          if (aiArrangement) {
            anyAIArrangedThisTurn = true;
            // AI已分牌，但尚未在gameState中确认 (confirmArrangement会处理确认和evalHands)
            return { ...player, arranged: aiArrangement };
          }
        }
        return player;
      });

      if (anyAIArrangedThisTurn) {
        // 使用函数式更新来处理状态，这样可以减少对外部gameState的直接依赖
        // 从而降低因依赖数组不当导致的循环风险
        setGameState(prevGameState => {
          // 基于 prevGameState (即调用此setGameState之前的gameState) 和 newPlayersStateAfterAI 来构建下一个状态
          let nextState = { ...prevGameState, players: newPlayersStateAfterAI };

          // 遍历刚刚AI安排好牌的玩家，并调用confirmArrangement
          newPlayersStateAfterAI.forEach(player => {
            // 确保是AI，并且有有效的arranged墩牌，并且之前未被确认
            // (检查prevGameState.players确保是对本轮新安排的牌进行确认)
            const originalPlayerInPrevState = prevGameState.players.find(p => p.id === player.id);
            if (
              !player.isHuman &&
              player.arranged && player.arranged.tou.length === 3 && // 已摆牌
              originalPlayerInPrevState && !originalPlayerInPrevState.confirmed // 之前未确认
            ) {
              // confirmArrangement 会返回更新后的整个游戏状态对象
              nextState = confirmArrangement(nextState, player.id, player.arranged);
            }
          });
          return nextState; // 返回最终计算出的新游戏状态
        });
      }
    }
    // 依赖项：
    // 1. gameState.gameState: 当游戏状态变为ARRANGING时触发
    // 2. gameState.players: 当玩家列表（例如，发牌后）发生变化时触发
    // arrangeCardsAI 和 confirmArrangement 是从外部导入的稳定函数，理论上不需要作为依赖。
    // setGameState 是React提供的稳定函数。
    // ESLint可能因为在useEffect内部读取了gameState.players而要求gameState作为依赖。
    // 如果是这样，并且上面的写法还报错，可以尝试将整个gameState加入，但要非常小心。
    // 或者，最严格地，将所有从gameState解构出来的变量都列入。
  }, [gameState.gameState, gameState.players]);
  // ^^^ 这是ESLint报错点附近的useEffect。行号会因实际代码而略有偏差。
  // 如果ESLint依然抱怨gameState，可以尝试改为 [gameState]
  // 或者，如果能确定具体是gameState的哪个子属性（除了gameState和players）被间接使用，
  // 则添加到依赖数组中。

  // 检查是否所有人都已确认，然后进入比牌阶段
  useEffect(() => {
    if (gameState.gameState === GameStates.ARRANGING) {
      const allConfirmed = gameState.players.every(p => p.confirmed);
      // 确保至少有一个玩家已确认，避免游戏开始时直接跳过ARRANGING
      if (allConfirmed && gameState.players.some(p => p.confirmed)) {
        console.log("All players confirmed, moving to comparing state.");
        setGameState(prevState => ({ ...prevState, gameState: GameStates.COMPARING }));
      }
    }
  }, [gameState.gameState, gameState.players]); // 这个依赖看起来是合理的

  // 比牌
  useEffect(() => {
    if (gameState.gameState === GameStates.COMPARING) {
      console.log("Comparing hands...");
      // 使用函数式更新总是更安全
      setGameState(currentState => compareAllHands(currentState));
    }
  }, [gameState.gameState]); // 这个依赖看起来是合理的

  const handleStartGame = () => {
    setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    setSelectedCards([]);
    // startGame 应该返回全新的初始状态，所以直接set
    setGameState(startGame(initialGameState));
  };

  // useCallback 包裹事件处理器，以确保传递给子组件的props是稳定的（如果它们没有改变依赖）
  const handleConfirmArrangementForHuman = useCallback((playerId, arrangedCards) => {
    setGameState(currentState => confirmArrangement(currentState, playerId, arrangedCards));
    if (playerId === humanPlayerId) {
        setSelectedCards([]);
    }
  }, [humanPlayerId]); // humanPlayerId 通常在组件生命周期内不变，除非玩家切换

  const handleAiArrangeRequestForHuman = useCallback(() => {
    const humanPlayer = gameState.players.find(p => p.id === humanPlayerId);
    if (humanPlayer && humanPlayer.hand.length === 13) {
      const aiSuggestedArrangement = arrangeCardsAI(humanPlayer.hand);
      if (aiSuggestedArrangement) {
        setArrangedHumanHand(aiSuggestedArrangement);
      } else {
        alert("AI 未能成功分牌，请手动操作。");
      }
    }
    // 这个回调依赖 gameState.players (为了找到humanPlayer) 和 humanPlayerId
    // arrangeCardsAI 是外部函数，setArrangedHumanHand 是稳定的
  }, [gameState.players, humanPlayerId]);

  const handleSelectCard = useCallback((card) => {
    setSelectedCards(prevSelected => {
      if (prevSelected.find(c => c.id === card.id)) {
        return prevSelected.filter(c => c.id !== card.id);
      } else {
        return [...prevSelected, card];
      }
    });
  }, []); // 这个回调没有外部依赖

  const handleArrangeDun = useCallback((dunName) => {
    if (selectedCards.length === 0) return;

    const humanPlayer = gameState.players.find(p => p.id === humanPlayerId);
    if (!humanPlayer || humanPlayer.confirmed) return;

    setArrangedHumanHand(prevDuns => {
      const newDuns = { ...prevDuns };
      // 从其他墩中移除这些牌
      Object.keys(newDuns).forEach(key => {
        if (key !== dunName) {
          newDuns[key] = (newDuns[key] || []).filter(c => !selectedCards.find(sc => sc.id === c.id));
        }
      });
      
      const dunSize = dunName === 'tou' ? 3 : 5;
      // 将选中的牌加入目标墩，并去重（以防万一有重复的card对象但id相同）
      const currentDunCardsIdSet = new Set((newDuns[dunName] || []).map(c => c.id));
      const cardsToAddFiltered = selectedCards.filter(sc => !currentDunCardsIdSet.has(sc.id));
      
      newDuns[dunName] = [...(newDuns[dunName] || []), ...cardsToAddFiltered].slice(0, dunSize);
      
      return newDuns;
    });
    setSelectedCards([]);
  }, [selectedCards, gameState.players, humanPlayerId]); // 依赖 selectedCards, gameState.players, humanPlayerId

  return (
    <div className="App">
      <header className="App-header">
        <h1>十三水游戏</h1>
        <button onClick={handleStartGame} disabled={gameState.gameState === GameStates.ARRANGING && !gameState.players.every(p => p.confirmed)}>
          {gameState.gameState === GameStates.INIT || gameState.gameState === GameStates.RESULTS ? '开始新游戏' : '重新开始'}
        </button>
      </header>
      <main>
        {gameState.gameState !== GameStates.INIT && (
          <Board
            players={gameState.players}
            onConfirmArrangement={handleConfirmArrangementForHuman} // 传递给人类玩家的确认函数
            onAiArrangeRequest={handleAiArrangeRequestForHuman}
            humanPlayerId={humanPlayerId}
            onSelectCard={handleSelectCard}
            selectedCards={selectedCards}
            onArrangeDun={handleArrangeDun}
            arrangedHumanHand={arrangedHumanHand}
          />
        )}
        {gameState.gameState === GameStates.RESULTS && gameState.roundResults && (
          <div className="results-display">
            <h3>本局结果:</h3>
            <p>{gameState.roundResults.summary}</p>
            <h4>详细比牌:</h4>
            <ul>
              {gameState.roundResults.details.map((detail, index) => (
                <li key={index}>
                  <strong>{detail.playerA} vs {detail.playerB}:</strong><br/>
                  头墩: {detail.tou} |
                  中墩: {detail.zhong} |
                  尾墩: {detail.wei}<br/>
                  {detail.playerA} 得分变化: {detail.totalScoreA}, {detail.playerB} 得分变化: {detail.totalScoreB}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
