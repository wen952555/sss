// frontend/src/components/AIPlayerDisplay.js
import React from 'react';

// getHandTypeName 函数可以保留，因为模态框里可能还会用到，或者直接从 handEvaluator 传进来
// const getHandTypeName = (typeNumber, handTypeNamesObject) => { ... }

const AIPlayerDisplay = ({ player }) => { 
  // handEvaluator prop 不再直接需要，牌型详情在模态框显示
  if (!player) {
    return (
      <div className="ai-player-display placeholder">
        <div className="ai-player-name">AI Slot</div>
      </div>
    );
  }

  const getStatusText = () => {
    if (player.isArranged && player.finalArrangement) return "已亮牌";
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
        {/* 牌型概要已移除，只显示分数 */}
        <div className="ai-player-score-container">
            {typeof player.score === 'number' && (
                <span className={`ai-player-total-score ${player.score > 0 ? 'positive' : player.score < 0 ? 'negative' : ''}`}>
                    总分: {player.score > 0 ? '+' : ''}{player.score}
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
