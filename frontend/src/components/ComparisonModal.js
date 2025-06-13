// frontend/src/components/ComparisonModal.js
import React from 'react';
import StaticCard from './StaticCard';
// HAND_TYPE_NAMES 导入不再需要，因为 getTypeName 被移除
// import { HAND_TYPE_NAMES } from '../logic/handEvaluator';

// getTypeName 函数已被移除，因为它不再被使用
// const getTypeName = (typeNum) => HAND_TYPE_NAMES[typeNum] || '未知';

const PlayerComparisonCell = ({ player, isHuman, players }) => {
    // 确保 player 和 player.finalArrangement (表示理牌完成) 存在
    if (!player || !player.finalArrangement) {
        return <div className="comparison-cell empty"><span>等待数据...</span></div>;
    }

    const topCards = (player.cards && Array.isArray(player.cards.TOP)) ? player.cards.TOP : [];
    const middleCards = (player.cards && Array.isArray(player.cards.MIDDLE)) ? player.cards.MIDDLE : [];
    const bottomCards = (player.cards && Array.isArray(player.cards.BOTTOM)) ? player.cards.BOTTOM : [];
    
    // 从 player.finalArrangement 解构 topEval, middleEval, bottomEval 已不再需要，
    // 因为我们不再显示牌型名称。
    // const { topEval, middleEval, bottomEval } = player.finalArrangement; 
    
    const roundScore = typeof player.roundScore === 'number' ? player.roundScore : 0;
    const totalScore = typeof player.score === 'number' ? player.score : 0;

    return (
        <div className={`comparison-cell ${isHuman ? 'human-player-cell' : 'ai-player-cell'}`}>
            <h4>
                {player.name} 
                <span className="score-summary">(本局: {roundScore >= 0 ? '+' : ''}{roundScore} | 总: {totalScore >= 0 ? '+' : ''}{totalScore})</span>
            </h4>
            <div className="comparison-hand-row">
                {/* 不再显示牌型名称 */}
                <strong>头道:</strong>
                <div className="mini-cards">
                    {topCards.map(c => <StaticCard key={c.id + '_modal_top_static'} cardData={c} />)}
                </div>
            </div>
            <div className="comparison-hand-row">
                <strong>中道:</strong>
                <div className="mini-cards">
                    {middleCards.map(c => <StaticCard key={c.id + '_modal_middle_static'} cardData={c} />)}
                </div>
            </div>
            <div className="comparison-hand-row">
                <strong>尾道:</strong>
                <div className="mini-cards">
                    {bottomCards.map(c => <StaticCard key={c.id + '_modal_bottom_static'} cardData={c} />)}
                </div>
            </div>
            {player.comparisonResults && Object.entries(player.comparisonResults).map(([opponentId, res]) => {
                const opponent = players.find(p=>p.id === opponentId);
                // 确保 res.details 存在且是数组
                if (res.details && Array.isArray(res.details) && res.details.some(d => d.toLowerCase().includes("打枪")) && res.score !== 0) {
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

const ComparisonModal = ({ onClose, players, humanPlayerId, onContinueGame }) => {
  if (!players || players.length === 0) return null;

  const humanPlayer = players.find(p => p.id === humanPlayerId);
  const aiOpponents = players.filter(p => p.id !== humanPlayerId);
  
  return (
    <div className="comparison-view-container"> 
      <div className="modal-content comparison-modal-content">
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
