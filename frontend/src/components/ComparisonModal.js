// frontend/src/components/ComparisonModal.js
import React from 'react';
import CardComponent from './Card';
import { HAND_TYPE_NAMES } from '../logic/handEvaluator';

const getTypeName = (typeNum) => HAND_TYPE_NAMES[typeNum] || '未知';

const PlayerComparisonCell = ({ player, isHuman }) => {
    // 首先确保 player 对象和 finalArrangement 存在
    if (!player || !player.finalArrangement) {
        return <div className="comparison-cell empty">等待数据...</div>;
    }

    // 安全地获取牌道卡牌，如果 player.cards 或其属性不存在，则默认为空数组
    const topCards = (player.cards && Array.isArray(player.cards.TOP)) ? player.cards.TOP : [];
    const middleCards = (player.cards && Array.isArray(player.cards.MIDDLE)) ? player.cards.MIDDLE : [];
    const bottomCards = (player.cards && Array.isArray(player.cards.BOTTOM)) ? player.cards.BOTTOM : [];
    
    const { topEval, middleEval, bottomEval } = player.finalArrangement;

    // 确保 roundScore 和 score 是数字，或者提供默认值
    const roundScore = typeof player.roundScore === 'number' ? player.roundScore : 0;
    const totalScore = typeof player.score === 'number' ? player.score : 0;

    return (
        <div className={`comparison-cell ${isHuman ? 'human-player-cell' : 'ai-player-cell'}`}>
            <h4>
                {player.name} 
                (本局: {roundScore >= 0 ? '+' : ''}{roundScore} | 总: {totalScore >= 0 ? '+' : ''}{totalScore})
            </h4>
            <div className="comparison-hand-row">
                <strong>头道 ({getTypeName(topEval?.type)}):</strong>
                <div className="mini-cards">
                    {topCards.map(c => <CardComponent key={c.id + '_modal_top'} cardData={c} draggableId={c.id+'_modal_top'} index={0} />)}
                </div>
            </div>
            <div className="comparison-hand-row">
                <strong>中道 ({getTypeName(middleEval?.type)}):</strong>
                <div className="mini-cards">
                    {middleCards.map(c => <CardComponent key={c.id + '_modal_middle'} cardData={c} draggableId={c.id+'_modal_middle'} index={0} />)}
                </div>
            </div>
            <div className="comparison-hand-row">
                <strong>尾道 ({getTypeName(bottomEval?.type)}):</strong>
                <div className="mini-cards">
                    {bottomCards.map(c => <CardComponent key={c.id + '_modal_bottom'} cardData={c} draggableId={c.id+'_modal_bottom'} index={0} />)}
                </div>
            </div>
            {player.comparisonResults && Object.values(player.comparisonResults).map((res, idx) => (
                res.details.some(d => d.toLowerCase().includes("打枪")) && res.score !== 0 ? (
                    <p key={`${player.id}_shoot_${idx}`} className={`shoot-info ${res.score > 0 ? 'positive-shoot' : 'negative-shoot'}`}>
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
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content comparison-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>×</button>
        <h2>本局比牌结果</h2>
        <div className="comparison-grid">
            {/* 确保传递的 player 对象是有效的 */}
            {humanPlayer && <PlayerComparisonCell player={humanPlayer} isHuman={true} />}
            {aiOpponents[0] && <PlayerComparisonCell player={aiOpponents[0]} isHuman={false}/>}
            {aiOpponents[1] ? <PlayerComparisonCell player={aiOpponents[1]} isHuman={false}/> : <div className="comparison-cell empty">AI②槽位空</div>}
            {aiOpponents[2] ? <PlayerComparisonCell player={aiOpponents[2]} isHuman={false}/> : <div className="comparison-cell empty">AI③槽位空</div>}
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
