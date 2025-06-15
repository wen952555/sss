// frontend_react/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import Board from './components/Board';
import { initialGameState, startGame, confirmArrangement, compareAllHands, GameStates } from './logic/gameLogic';
import { arrangeCardsAI } from './logic/aiLogic';
import './App.css';

// 后端 API 地址 (示例，实际根据部署情况修改)
// const API_BASE_URL = process.env.NODE_ENV === 'production' 
//   ? 'https://wenge.cloudns.ch:10758/api' // 您的 Serv00 后端API地址
//   : 'http://localhost:8000/api'; // 本地PHP开发服务器 (如果使用)


function App() {
  const [gameState, setGameState] = useState(initialGameState);
  const [selectedCards, setSelectedCards] = useState([]); // 用于人类玩家选择牌
  const [arrangedHumanHand, setArrangedHumanHand] = useState({ tou: [], zhong: [], wei: [] }); // 人类玩家暂存的墩牌

  const humanPlayerId = gameState.players.find(p => p.isHuman)?.id || 'player1';

  // AI 自动分牌
  useEffect(() => {
    if (gameState.gameState === GameStates.ARRANGING) {
      let changed = false;
      const updatedPlayers = gameState.players.map(player => {
        if (!player.isHuman && !player.confirmed && player.hand.length === 13) {
          console.log(`AI ${player.name} is arranging cards...`);
          const aiArrangement = arrangeCardsAI(player.hand);
          if (aiArrangement) {
            changed = true;
            // AI 自动确认 (通常AI分好牌就直接确认)
            // 这里我们先让AI摆好，但不立即调用confirmArrangement, 而是等所有AI都处理完或由一个统一的流程处理
            return { ...player, arranged: aiArrangement, /* confirmed: true */ }; 
          }
        }
        return player;
      });

      if (changed) {
        // AI 玩家自动确认他们的牌墩
        // 这一步可以做得更细致，比如一个AI摆好后，就调用confirmArrangement
        // 或者等所有AI都摆好，然后一次性更新状态并检查是否可以比牌
        let tempState = { ...gameState, players: updatedPlayers };
        updatedPlayers.forEach(player => {
            if(!player.isHuman && player.arranged.tou.length === 3 && !player.confirmed) { // 确保AI已摆牌
                tempState = confirmArrangement(tempState, player.id, player.arranged);
            }
        });
        setGameState(tempState);
      }
    }
  }, [gameState.gameState, gameState.players]); // 依赖gameState.players的引用变化

  // 检查是否所有人都已确认，然后进入比牌阶段
  useEffect(() => {
    if (gameState.gameState === GameStates.ARRANGING) {
      const allConfirmed = gameState.players.every(p => p.confirmed);
      if (allConfirmed && gameState.players.some(p => p.confirmed)) { // 确保至少有一个人确认了
        console.log("All players confirmed, moving to comparing state.");
        setGameState(prevState => ({ ...prevState, gameState: GameStates.COMPARING }));
      }
    }
  }, [gameState.players, gameState.gameState]);


  // 比牌
  useEffect(() => {
    if (gameState.gameState === GameStates.COMPARING) {
      console.log("Comparing hands...");
      setGameState(currentState => compareAllHands(currentState));
    }
  }, [gameState.gameState]);


  const handleStartGame = () => {
    setArrangedHumanHand({ tou: [], zhong: [], wei: [] }); // 清空上一局人类玩家的牌
    setSelectedCards([]);
    setGameState(startGame(initialGameState)); // 重置分数和状态开始新游戏
  };

  const handleConfirmArrangement = useCallback((playerId, arrangedCards) => {
    setGameState(currentState => confirmArrangement(currentState, playerId, arrangedCards));
    if (playerId === humanPlayerId) {
        setSelectedCards([]); // 清空选择
    }
  }, [humanPlayerId]);

  const handleAiArrangeRequestForHuman = () => {
    const humanPlayer = gameState.players.find(p => p.id === humanPlayerId);
    if (humanPlayer && humanPlayer.hand.length === 13) {
      const aiSuggestedArrangement = arrangeCardsAI(humanPlayer.hand);
      if (aiSuggestedArrangement) {
        setArrangedHumanHand(aiSuggestedArrangement);
        // 不自动确认，让人类玩家检查后手动确认
      } else {
        alert("AI 未能成功分牌，请手动操作。");
      }
    }
  };

  const handleSelectCard = (card) => {
    setSelectedCards(prevSelected => {
      if (prevSelected.find(c => c.id === card.id)) {
        return prevSelected.filter(c => c.id !== card.id);
      } else {
        return [...prevSelected, card];
      }
    });
  };

  const handleArrangeDun = (dunName) => {
    if (selectedCards.length === 0) return;

    const humanPlayer = gameState.players.find(p => p.id === humanPlayerId);
    if (!humanPlayer || humanPlayer.confirmed) return;

    setArrangedHumanHand(prevDuns => {
      const newDuns = { ...prevDuns };
      const currentDunCards = [...(newDuns[dunName] || [])];
      let cardsToAdd = [...selectedCards];

      // 从其他墩中移除这些牌 (如果这些牌之前在其他墩)
      Object.keys(newDuns).forEach(key => {
        if (key !== dunName) {
          newDuns[key] = (newDuns[key] || []).filter(c => !selectedCards.find(sc => sc.id === c.id));
        }
      });
      
      // 添加到目标墩，并确保不超过墩的大小限制
      const dunSize = dunName === 'tou' ? 3 : 5;
      const combined = [...currentDunCards, ...cardsToAdd];
      newDuns[dunName] = combined.slice(0, dunSize);
      
      // 如果超过了，把多余的牌放回 selectedCards (或者提示用户)
      // 为简化，这里不处理放回，用户需要自行管理选中牌的数量
      // 更好的做法是，如果目标墩满了，则不允许添加更多

      return newDuns;
    });
    setSelectedCards([]); // 清空选择
  };


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
            onConfirmArrangement={handleConfirmArrangement}
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
