// frontend/src/components/ComparisonModal.js
import React from 'react';
import CardComponent from './Card'; // 用于显示牌面
import { HAND_TYPE_NAMES } from '../logic/handEvaluator'; // 需要牌型名称

// Helper to get hand type name, similar to AIPlayerDisplay
const getTypeName = (typeNum) => HAND_TYPE_NAMES[typeNum] || '未知';

// 单个玩家在田字格中的显示单元
const PlayerComparisonCell = ({ player, isHuman }) => {
    if (!player || !player.finalArrangement) {
        return <div className="comparison-cell empty">等待玩家...</div>;
    }
    const { top, middle, bottom } = player.cards || {TOP:[], MIDDLE:[], BOTTOM:[]}; // 从摆好的牌显示
    const { topEval, middleEval, bottomEval } = player.finalArrangement;

    return (
        <div className={`comparison-cell ${isHuman ? 'human-player-cell' : 'ai-player-cell'}`}>
            <h4>{player.name} (本局: {player.roundScore > 0 ? '+' : ''}{player.roundScore} | 总: {player.score})</h4>
            <div className="comparison-hand-row">
                <strong>头道 ({getTypeName(topEval?.type)}):</strong>
                <div className="mini-cards">{top.map(c => <CardComponent key={c.id} cardData={c} draggableId={c.id+'_modal'} index={0} />)}</div>
            </div>
            <div className="comparison-hand-row">
                <strong>中道 ({getTypeName(middleEval?.type)}):</strong>
                <div className="mini-cards">{middle.map(c => <CardComponent key={c.id} cardData={c} draggableId={c.id+'_modal'} index={0} />)}</div>
            </div>
            <div className="comparison-hand-row">
                <strong>尾道 ({getTypeName(bottomEval?.type)}):</strong>
                <div className="mini-cards">{bottom.map(c => <CardComponent key={c.id} cardData={c} draggableId={c.id+'_modal'} index={0} />)}</div>
            </div>
            {/* 可以加入对战详情的简述，例如打枪信息 */}
            {player.comparisonResults && Object.values(player.comparisonResults).map((res, idx) => (
                res.details.some(d => d.toLowerCase().includes("打枪")) && res.score !== 0 ? (
                    <p key={idx} className="shoot-info">
                        {res.score > 0 ? `打枪对手!` : `被对手打枪!`}
                    </p>
                ) : null
            ))}
        </div>
    );
};


const ComparisonModal = ({ isOpen, onClose, players, humanPlayerId }) => {
  if (!isOpen || !players || players.length === 0) {
    return null;
  }

  const humanPlayer = players.find(p => p.id === humanPlayerId);
  const aiOpponents = players.filter(p => p.id !== humanPlayerId);

  // 田字型布局：左上真人，右上AI1, 左下AI2, 右下AI3
  // 如果AI少于3个，可以调整布局或留空
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content comparison-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>×</button>
        <h2>本局比牌结果</h2>
        <div className="comparison-grid">
            {humanPlayer && <PlayerComparisonCell player={humanPlayer} isHuman={true} />}
            {aiOpponents[0] && <PlayerComparisonCell player={aiOpponents[0]} isHuman={false}/>}
            {/* 如果只有1个AI，下面两个会是undefined，CSS需要处理好 */}
            {aiOpponents[1] ? <PlayerComparisonCell player={aiOpponents[1]} isHuman={false}/> : <div className="comparison-cell empty"></div>}
            {aiOpponents[2] ? <PlayerComparisonCell player={aiOpponents[2]} isHuman={false}/> : <div className="comparison-cell empty"></div>}
        </div>
        {/* 可以在底部显示一些全局信息，例如谁是最大赢家等 */}
      </div>
    </div>
  );
};

export default ComparisonModal;
