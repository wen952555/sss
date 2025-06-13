// frontend/src/components/AIPlayerDisplay.js
import React from 'react';

const getHandTypeName = (typeNumber, handTypeNamesObject) => {
  if (handTypeNamesObject && typeof typeNumber === 'number') {
    return handTypeNamesObject[typeNumber] || '处理中';
  }
  const names = { 0: "乌龙", 1: "一对", 3: "三条", 5: "同花", 6: "葫芦", 7: "铁支", 8: "同花顺"}; // 简易回退
  return names[typeNumber] || '未知';
};

const AIPlayerDisplay = ({ player, handEvaluator }) => {
  if (!player) {
    return (
      <div className="ai-player-display placeholder">
        <div className="ai-player-name">AI Slot</div>
      </div>
    );
  }

  const getStatusText = () => {
    if (player.isArranged && player.finalArrangement) return "已亮牌"; // 确保 finalArrangement 也存在
    if (player.isThinking) return "理牌中...";
    if (player.initial13Cards && player.initial13Cards.length === 13 && !player.isArranged) return "等待理牌";
    return "等待发牌";
  };

  return (
    <div className={`ai-player-display ${player.isArranged ? 'arranged' : ''} ${player.isThinking ? 'thinking' : ''}`}>
      <div className="ai-player-avatar">
        <span>{player.name.substring(0, 2)}</span>
      </div>
      <div className="ai-player-info">
        <div className="ai-player-name">{player.name}</div>
        <div className="ai-player-status">{getStatusText()}</div>
        {player.isArranged && player.finalArrangement && handEvaluator && handEvaluator.HAND_TYPE_NAMES && (
          <div className="ai-player-hands-summary">
            <div className="ai-hand-summary top">
              头: {getHandTypeName(player.finalArrangement.topEval?.type, handEvaluator.HAND_TYPE_NAMES)}
            </div>
            <div className="ai-hand-summary middle">
              中: {getHandTypeName(player.finalArrangement.middleEval?.type, handEvaluator.HAND_TYPE_NAMES)}
            </div>
            <div className="ai-hand-summary bottom">
              尾: {getHandTypeName(player.finalArrangement.bottomEval?.type, handEvaluator.HAND_TYPE_NAMES)}
            </div>
          </div>
        )}
        {/* 显示总分和本局得分 */}
        <div className="ai-player-score-container">
            {typeof player.score === 'number' && (
                <span className={`ai-player-total-score ${player.score > 0 ? 'positive' : player.score < 0 ? 'negative' : ''}`}>
                    总: {player.score > 0 ? '+' : ''}{player.score}
                </span>
            )}
            {typeof player.roundScore === 'number' && player.isArranged && // 只有本局已结算才显示
                <span className={`ai-player-round-score ${player.roundScore > 0 ? 'positive' : player.roundScore < 0 ? 'negative' : ''}`}>
                    (本局: {player.roundScore > 0 ? '+' : ''}{player.roundScore})
                </span>
            }
        </div>
      </div>
    </div>
  );
};

export default AIPlayerDisplay;
