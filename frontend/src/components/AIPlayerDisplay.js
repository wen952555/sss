// frontend/src/components/AIPlayerDisplay.js
import React from 'react';

// 简单的牌型映射，实际应用中可能需要更完整的
const getHandTypeName = (typeNumber, handEvaluator) => {
  if (handEvaluator && handEvaluator.HAND_TYPE_NAMES) {
    return handEvaluator.HAND_TYPE_NAMES[typeNumber] || '未知';
  }
  // 简易回退
  const names = { 0: "乌龙", 1: "一对", 3: "三条", 5: "同花", 6: "葫芦", 7: "铁支", 8: "同花顺"};
  return names[typeNumber] || '处理中';
};


const AIPlayerDisplay = ({ player, handEvaluator }) => {
  if (!player) return null;

  const getStatusText = () => {
    if (player.isArranged) return "已完成";
    if (player.isThinking) return "理牌中..."; // 假设有这个状态
    return "等待中";
  };

  return (
    <div className={`ai-player-display ${player.isArranged ? 'arranged' : ''}`}>
      <div className="ai-player-name">{player.name}</div>
      <div className="ai-player-status">{getStatusText()}</div>
      {player.isArranged && player.finalArrangement && (
        <div className="ai-player-hands-summary">
          <div className="ai-hand-summary">
            头: {getHandTypeName(player.finalArrangement.topEval?.type, handEvaluator)}
          </div>
          <div className="ai-hand-summary">
            中: {getHandTypeName(player.finalArrangement.middleEval?.type, handEvaluator)}
          </div>
          <div className="ai-hand-summary">
            尾: {getHandTypeName(player.finalArrangement.bottomEval?.type, handEvaluator)}
          </div>
          {/* 这里可以加一个总得分或特殊牌型提示 */}
        </div>
      )}
      {/* 未来可以显示AI的牌面缩略图，但这会比较复杂 */}
    </div>
  );
};

export default AIPlayerDisplay;
