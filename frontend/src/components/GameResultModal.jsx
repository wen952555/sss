// frontend/src/components/GameResultModal.jsx
import React from 'react';
import Lane from './Lane';
import './GameResultModal.css'; // 确保引入的是新的CSS

const GameResultModal = ({ result, onClose }) => {
  if (!result) return null;

  const getLaneResultInfo = (laneResult) => {
    if (laneResult === 'win') return { text: '胜利', className: 'win' };
    if (laneResult === 'loss') return { text: '失败', className: 'loss' };
    return { text: '平局', className: 'tie' };
  };
  
  const totalScoreText = result.score > 0 ? `总分: +${result.score}` : `总分: ${result.score}`;
  const totalScoreClass = result.score > 0 ? 'win' : (result.score < 0 ? 'loss' : 'tie');

  // 判断牌墩数量以决定渲染逻辑
  const isThirteenGame = result.playerHand.top.length === 3;
  const topCount = isThirteenGame ? 3 : 2;
  const middleCount = isThirteenGame ? 5 : 3;
  const bottomCount = isThirteenGame ? 5 : 3;
  
  const aiTopCount = result.aiHand.top.length;
  const aiMiddleCount = result.aiHand.middle.length;
  const aiBottomCount = result.aiHand.bottom.length;


  return (
    // 使用新的 backdrop 和 content 类名
    <div className="modal-backdrop">
      <div className="modal-content result-modal-content">
        <h2>比牌结果</h2>

        <div className={`total-score ${totalScoreClass}`}>{totalScoreText}</div>

        {/* 对比区域 */}
        <div className="comparison-section">
          <div className="lane-result-label">你的牌</div>
          <div></div>
          <div className="lane-result-label">AI的牌</div>

          {['top', 'middle', 'bottom'].map(lane => {
            const laneResult = getLaneResultInfo(result.results[lane]);
            return (
              <React.Fragment key={lane}>
                <div>{result.playerEval[lane].name}</div>
                <div className={`lane-result ${laneResult.className}`}>{laneResult.text}</div>
                <div>{result.aiEval[lane].name}</div>
              </React.Fragment>
            );
          })}
        </div>

        {/* 你的牌 */}
        <div className="player-section">
          <h3>你的牌</h3>
          <div className="lanes-area-modal">
            <Lane title="头道" cards={result.playerHand.top} expectedCount={topCount} handType={result.playerEval.top.name} />
            <Lane title="中道" cards={result.playerHand.middle} expectedCount={middleCount} handType={result.playerEval.middle.name} />
            <Lane title="尾道" cards={result.playerHand.bottom} expectedCount={bottomCount} handType={result.playerEval.bottom.name} />
          </div>
        </div>

        {/* AI的牌 */}
        <div className="player-section">
          <h3>AI 玩家</h3>
          <div className="lanes-area-modal">
            <Lane title="头道" cards={result.aiHand.top} expectedCount={aiTopCount} handType={result.aiEval.top.name} />
            <Lane title="中道" cards={result.aiHand.middle} expectedCount={aiMiddleCount} handType={result.aiEval.middle.name} />
            <Lane title="尾道" cards={result.aiHand.bottom} expectedCount={aiBottomCount} handType={result.aiEval.bottom.name} />
          </div>
        </div>
        
        <button onClick={onClose} className="close-button">返回大厅</button>
      </div>
    </div>
  );
};

export default GameResultModal;