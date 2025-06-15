// frontend_react/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import Board from './components/Board';
import { initialGameState, startGame, confirmArrangement, compareAllHands, GameStates } from './logic/gameLogic';
import { arrangeCardsAI } from './logic/aiLogic';
import './App.css';

// 后端 API 地址
// eslint-disable-next-line no-unused-vars
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://wenge.cloudns.ch/api' // 您的 Serv00 后端API地址 (无端口)
  : 'http://localhost:8000/api'; // 本地PHP开发服务器 (如果使用)


function App() {
  const [gameState, setGameState] = useState(initialGameState);
  const [selectedCards, setSelectedCards] = useState([]);
  const [arrangedHumanHand, setArrangedHumanHand] = useState({ tou: [], zhong: [], wei: [] });

  const humanPlayerId = gameState.players.find(p => p.isHuman)?.id || 'player1';

  // AI 自动分牌
  useEffect(() => {
    if (gameState.gameState === GameStates.ARRANGING) {
      let anyAIArrangedThisTurn = false;
      const currentPlayers = gameState.players;

      const newPlayersStateAfterAI = currentPlayers.map(player => {
        if (!player.isHuman && !player.confirmed && player.hand.length === 13) {
          const aiArrangement = arrangeCardsAI(player.hand);
          if (aiArrangement) {
            anyAIArrangedThisTurn = true;
            return { ...player, arranged: aiArrangement };
          }
        }
        return player;
      });

      if (anyAIArrangedThisTurn) {
        setGameState(prevGameState => {
          let nextState = { ...prevGameState, players: newPlayersStateAfterAI };
          newPlayersStateAfterAI.forEach(player => {
            const originalPlayerInPrevState = prevGameState.players.find(p => p.id === player.id);
            if (
              !player.isHuman &&
              player.arranged && player.arranged.tou.length === 3 &&
              originalPlayerInPrevState && !originalPlayerInPrevState.confirmed
            ) {
              nextState = confirmArrangement(nextState, player.id, player.arranged);
            }
          });
          return nextState;
        });
      }
    }
  }, [gameState.gameState, gameState.players]);

  // 检查是否所有人都已确认，然后进入比牌阶段
  useEffect(() => {
    if (gameState.gameState === GameStates.ARRANGING) {
      const allConfirmed = gameState.players.every(p => p.confirmed);
      if (allConfirmed && gameState.players.some(p => p.confirmed)) {
        console.log("All players confirmed, moving to comparing state.");
        setGameState(prevState => ({ ...prevState, gameState: GameStates.COMPARING }));
      }
    }
  }, [gameState.gameState, gameState.players]);

  // 比牌
  useEffect(() => {
    if (gameState.gameState === GameStates.COMPARING) {
      console.log("Comparing hands...");
      setGameState(currentState => compareAllHands(currentState));
    }
  }, [gameState.gameState]);

  const handleStartGame = () => {
    setArrangedHumanHand({ tou: [], zhong: [], wei: [] });
    setSelectedCards([]);
    setGameState(startGame(initialGameState));
  };

  const handleConfirmArrangementForHuman = useCallback((playerId, arrangedCards) => {
    setGameState(currentState => confirmArrangement(currentState, playerId, arrangedCards));
    if (playerId === humanPlayerId) {
        setSelectedCards([]);
    }
  }, [humanPlayerId]);

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
  }, [gameState.players, humanPlayerId]);

  const handleSelectCard = useCallback((card) => {
    setSelectedCards(prevSelected => {
      if (prevSelected.find(c => c.id === card.id)) {
        return prevSelected.filter(c => c.id !== card.id);
      } else {
        return [...prevSelected, card];
      }
    });
  }, []);

  const handleArrangeDun = useCallback((dunName) => {
    if (selectedCards.length === 0) return;

    const humanPlayer = gameState.players.find(p => p.id === humanPlayerId);
    if (!humanPlayer || humanPlayer.confirmed) return;

    setArrangedHumanHand(prevDuns => {
      const newDuns = { ...prevDuns };
      Object.keys(newDuns).forEach(key => {
        if (key !== dunName) {
          newDuns[key] = (newDuns[key] || []).filter(c => !selectedCards.find(sc => sc.id === c.id));
        }
      });
      
      const dunSize = dunName === 'tou' ? 3 : 5;
      const currentDunCardsIdSet = new Set((newDuns[dunName] || []).map(c => c.id));
      const cardsToAddFiltered = selectedCards.filter(sc => !currentDunCardsIdSet.has(sc.id));
      
      newDuns[dunName] = [...(newDuns[dunName] || []), ...cardsToAddFiltered].slice(0, dunSize);
      
      return newDuns;
    });
    setSelectedCards([]);
  }, [selectedCards, gameState.players, humanPlayerId]);

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
            onConfirmArrangement={handleConfirmArrangementForHuman}
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
