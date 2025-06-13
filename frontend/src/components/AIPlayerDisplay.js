// frontend/src/components/AIPlayerDisplay.js
import React from 'react';

// 简单的牌型名称获取函数
const getHandTypeName = (typeNumber, handTypeNamesObject) => {
  if (handTypeNamesObject && typeof typeNumber === 'number') {
    return handTypeNamesObject[typeNumber] || '处理中';
  }
  return '未知';
};

const AIPlayerDisplay = ({ player, handEvaluator }) => {
  // handEvaluator 期望是一个包含 HAND_TYPE_NAMES 的对象
  // 例如: handEvaluator={{ HAND_TYPE_NAMES: HAND_TYPE_NAMES_FROM_LOGIC }}

  if (!player) {
    return (
      <div className="ai-player-display placeholder">
        <div className="ai-player-name">AI Slot</div>
      </div>
    );
  }

  const getStatusText = () => {
    if (player.isArranged) return "已亮牌";
    if (player.isThinking) return "理牌中...";
    if (player.initial13Cards && player.initial13Cards.length === 13) return "等待理牌";
    return "等待发牌";
  };

  return (
    <div className={`ai-player-display ${player.isArranged ? 'arranged' : ''} ${player.isThinking ? 'thinking' : ''}`}>
      <div className="ai-player-avatar"> {/* 可选：AI头像 */}
        {/* <img src={`/avatars/${player.id}.png`} alt={player.name} /> */}
        <span>{player.name.substring(0, 2)}</span> {/* 简易头像替代 */}
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
            {/* 可以根据 player.finalArrangement.isMisArranged (虽然AI不应该倒水) 或特殊牌型显示 */}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPlayerDisplay;
