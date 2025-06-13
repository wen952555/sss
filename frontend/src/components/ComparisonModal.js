// frontend/src/components/ComparisonModal.js
import React from 'react';
import StaticCard from './StaticCard';
import { HAND_TYPE_NAMES } from '../logic/handEvaluator';

const getTypeName = (typeNum) => HAND_TYPE_NAMES[typeNum] || '未知';

const PlayerComparisonCell = ({ player, isHuman, players }) => {
    if (!player || !player.finalArrangement) {
        return <div className="comparison-cell empty"><span>等待数据...</span></div>;
    }

    // 确保 cards 对象及其属性存在且为数组
    const topCards = (player.cards && Array.isArray(player.cards.TOP)) ? player.cards.TOP : [];
    const middleCards = (player.cards && Array.isArray(player.cards.MIDDLE)) ? player.cards.MIDDLE : [];
    const bottomCards = (player.cards && Array.isArray(player.cards.BOTTOM)) ? player.cards.BOTTOM : [];
    
    const { topEval, middleEval, bottomEval } = player.finalArrangement;
    const roundScore = typeof player.roundScore === 'number' ? player.roundScore : 0;
    const totalScore = typeof player.score === 'number' ? player.score : 0;

    return (
        <div className={`comparison-cell ${isHuman ? 'human-player-cell' : 'ai-player-cell'}`}>
            <h4>
                {player.name} 
                <span className="score-summary">(本局: {roundScore >= 0 ? '+' : ''}{roundScore} | 总: {totalScore >= 0 ? '+' : ''}{totalScore})</span>
            </h4>
            <div className="comparison-hand-row">
                <strong>头道 <span className="hand-eval-name">({getTypeName(topEval?.type)})</span>:</strong>
                <div className="mini-cards">
                    {topCards.map(c => <StaticCard key={c.id + '_modal_top_static'} cardData={c} />)}
                </div>
            </div>
            <div className="comparison-hand-row">
                <strong>中道 <span className="hand-eval-name">({getTypeName(middleEval?.type)})</span>:</strong>
                <div className="mini-cards">
                    {middleCards.map(c => <StaticCard key={c.id + '_modal_middle_static'} cardData={c} />)}
                </div>
            </div>
            <div className="comparison-hand-row">
                <strong>尾道 <span className="hand-eval-name">({getTypeName(bottomEval?.type)})</span>:</strong>
                <div className="mini-cards">
                    {bottomCards.map(c => <StaticCard key={c.id + '_modal_bottom_static'} cardData={c} />)}
                </div>
            </div>
            {/* 显示打枪信息 */}
            {player.comparisonResults && Object.entries(player.comparisonResults).map(([opponentId, res]) => {
                 // 仅显示与真人玩家相关的打枪信息，或者根据需要调整
                const opponent = players.find(p => p.id === opponentId);
                if (res.details.some(d => d.toLowerCase().includes("打枪")) && res.score !== 0) {
                    return (
                        <p key={`${player.id}_vs_${opponentId}_shoot`} className={`shoot-info ${res.score > 0 ? 'positive-shoot' : 'negative-shoot'}`}>
                            {res.score > 0 ? `打枪 ${opponent?.name || '对手'}!` : `被 ${opponent?.name || '对手'} 打枪!`}
                        </p>
                    );
                }
                return null;
            })}
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
            {/* 田字格布局: 左上真人，右上AI1, 左下AI2, 右下AI3 */}
            {humanPlayer    ? <PlayerComparisonCell player={humanPlayer}    isHuman={true}  players={players} /> : <div className="comparison-cell empty"><span>真人玩家</span></div>}
            {aiOpponents[0] ? <PlayerComparisonCell player={aiOpponents[0]} isHuman={false} players={players} /> : <div className="comparison-cell empty"><span>AI ①</span></div>}
            {aiOpponents[1] ? <PlayerComparisonCell player={aiOpponents[1]} isHuman={false} players={players} /> : <div className="comparison-cell empty"><span>AI ②</span></div>}
            {aiOpponents[2] ? <PlayerComparisonCell player={aiOpponents[2]} isHuman={false} players={players} /> : <div className="comparison-cell empty"><span>AI ③</span></div>}
        </div>
        <div className="modal-actions">
            <button className="game-button modal-close-btn-bottom" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
