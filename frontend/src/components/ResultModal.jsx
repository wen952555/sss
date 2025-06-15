import React, { useContext } from 'react';
import { GameContext } from '../contexts/GameContext';

const ResultModal = () => {
  const { gameState, resetGame } = useContext(GameContext);
  
  if (!gameState.results) return null;
  
  // 计算赢家
  const calculateWinner = () => {
    let maxScore = -Infinity;
    let winner = null;
    
    gameState.results.forEach(result => {
      if (result.totalScore > maxScore) {
        maxScore = result.totalScore;
        winner = result.playerId;
      }
    });
    
    return winner;
  };
  
  const winnerId = calculateWinner();
  
  return (
    <div className="result-modal">
      <div className="modal-content">
        <h2>游戏结果</h2>
        
        <div className="result-grid">
          <div className="grid-header">玩家</div>
          <div className="grid-header">头道</div>
          <div className="grid-header">中道</div>
          <div className="grid-header">尾道</div>
          <div className="grid-header">总分</div>
          
          {gameState.results.map((result, index) => {
            const player = gameState.players[result.playerId];
            const isWinner = result.playerId === winnerId;
            
            return (
              <React.Fragment key={index}>
                <div className={`player-name ${isWinner ? 'winner' : ''}`}>
                  {player.name}
                  {isWinner && <span className="crown">👑</span>}
                </div>
                <div>{result.frontScore}</div>
                <div>{result.middleScore}</div>
                <div>{result.backScore}</div>
                <div className="total-score">{result.totalScore}</div>
              </React.Fragment>
            );
          })}
        </div>
        
        <div className="special-rules">
          {gameState.results.some(r => !r.isValid) && (
            <div className="rule-violation">
              ⚠️ 有玩家倒水（头道 > 中道 > 尾道），总分计0分
            </div>
          )}
        </div>
        
        <button className="close-btn" onClick={resetGame}>
          再来一局
        </button>
      </div>
    </div>
  );
};

export default ResultModal;
