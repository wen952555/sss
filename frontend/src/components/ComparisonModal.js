// frontend/src/components/ComparisonModal.js
import React from 'react';
import StaticCard from './StaticCard';
import { HAND_TYPE_NAMES } from '../logic/handEvaluator';

const getTypeName = (typeNum) => HAND_TYPE_NAMES[typeNum] || '未知';

const PlayerComparisonCell = ({ player, isHuman, players }) => { /* ... (保持不变) ... */ };
// (PlayerComparisonCell 的代码与上一版本完全相同，此处省略以保持简洁)
// 确保这里的 PlayerComparisonCell 代码是您满意的最新版本

const ComparisonModal = ({ onClose, players, humanPlayerId, onContinueGame }) => {
  // isOpen prop 不再需要，由 App.js 控制渲染
  if (!players || players.length === 0) {
    return null; // 或者一个加载/错误状态
  }

  const humanPlayer = players.find(p => p.id === humanPlayerId);
  const aiOpponents = players.filter(p => p.id !== humanPlayerId);
  
  return (
    // 这个 div 现在是全屏的“比牌视图”容器
    <div className="comparison-view-container"> 
      <div className="modal-content comparison-modal-content" /*onClick={(e) => e.stopPropagation()} // 不再需要阻止冒泡，因为没有覆盖层点击关闭 */ >
        {/* 关闭按钮可以保留，或者完全依赖底部的“继续游戏”按钮 */}
        <button className="modal-close-button top-right-close" onClick={onClose}>×</button>
        <h2>本局比牌结果</h2>
        <div className="comparison-grid">
            {humanPlayer    ? <PlayerComparisonCell player={humanPlayer}    isHuman={true}  players={players} /> : <div className="comparison-cell empty"><span>真人玩家</span></div>}
            {aiOpponents[0] ? <PlayerComparisonCell player={aiOpponents[0]} isHuman={false} players={players} /> : <div className="comparison-cell empty"><span>AI ①</span></div>}
            {aiOpponents[1] ? <PlayerComparisonCell player={aiOpponents[1]} isHuman={false} players={players} /> : <div className="comparison-cell empty"><span>AI ②</span></div>}
            {aiOpponents[2] ? <PlayerComparisonCell player={aiOpponents[2]} isHuman={false} players={players} /> : <div className="comparison-cell empty"><span>AI ③</span></div>}
        </div>
        <div className="modal-actions">
            <button className="game-button continue-game-button" onClick={onContinueGame}>继续游戏</button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
