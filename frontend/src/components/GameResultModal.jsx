// frontend/src/components/GameResultModal.jsx
import React from 'react';
import Lane from './Lane';
import './GameResultModal.css';

const GameResultModal = ({ result, onClose }) => {
  if (!result) return null;

  const getLaneResultText = (laneResult) => {
    if (laneResult === 'win') return { text: '胜利', className: 'win' };
    if (laneResult === 'loss') return { text: '失败', className: 'loss' };
    return { text: '平局', className: 'tie' };
  };
  
  const totalScoreText = result.score > 0 ? `总分: +${result.score}` : `总分: ${result.score}`;
  const totalScoreClass = result.score > 0 ? 'win' : (result.score < 0 ? 'loss' : 'tie');

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>比牌结果</h2>

        {/* AI的牌 */}
        <div className="player-section">
          <h3>AI 玩家</h3>
          <div className="lanes-area-modal">
            <Lane title="头墩" cards={result.aiHand.top} expectedCount={3} handType={result.aiEval.top.name} />
            <Lane title="中墩" cards={result.aiHand.middle} expectedCount={5} handType={result.aiEval.middle.name} />
            <Lane title="尾墩" cards={result.aiHand.bottom} expectedCount={5} handType={result.aiEval.bottom.name} />
          </div>
        </div>

        {/* 结果对比 */}
        <div className="comparison-section">
            {['top', 'middle', 'bottom'].map(lane => {
                const laneResult = getLaneResultText(result.results[lane]);
                return (
                    <div key={lane} className={`lane-result ${laneResult.className}`}>
                        {lane.charAt(0).toUpperCase() + lane.slice(1)}: {laneResult.text}
                    </div>
                );
            })}
        </div>

        {/* 你的牌 */}
        <div className="player-section">
          <h3>你的牌</h3>
          <div className="lanes-area-modal">
            <Lane title="头墩" cards={result.playerHand.top} expectedCount={3} handType={result.playerEval.top.name} />
            <Lane title="中墩" cards={result.playerHand.middle} expectedCount={5} handType={result.playerEval.middle.name} />
            <Lane title="尾墩" cards={result.playerHand.bottom} expectedCount={5} handType={result.playerEval.bottom.name} />
          </div>
        </div>
        
        <div className={`total-score ${totalScoreClass}`}>{totalScoreText}</div>

        <button onClick={onClose} className="close-button">再玩一局</button>
      </div>
    </div>
  );
};

export default GameResultModal;
