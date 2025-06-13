// frontend/src/components/ComparisonModal.js
import React from 'react';
import StaticCard from './StaticCard';
// HAND_TYPE_NAMES 不再需要在单元格内直接使用，但如果 scoreCalculator 仍然依赖它生成 details，则保留导入
// import { HAND_TYPE_NAMES } from '../logic/handEvaluator'; 

// getTypeName 函数不再需要在单元格内直接使用
// const getTypeName = (typeNum) => HAND_TYPE_NAMES[typeNum] || '未知';

const PlayerComparisonCell = ({ player, isHuman, players }) => {
    if (!player || !player.finalArrangement) { // 确保 finalArrangement 存在才显示牌
        return <div className="comparison-cell empty"><span>等待数据...</span></div>;
    }

    // 从 player.cards (AI理好后的牌) 或 player.finalArrangement (如果 cards 结构不同) 获取牌
    // 假设 player.cards 存储的是最终摆放的牌对象数组
    const topCards = (player.cards && Array.isArray(player.cards.TOP)) ? player.cards.TOP : [];
    const middleCards = (player.cards && Array.isArray(player.cards.MIDDLE)) ? player.cards.MIDDLE : [];
    const bottomCards = (player.cards && Array.isArray(player.cards.BOTTOM)) ? player.cards.BOTTOM : [];
    
    // 分数仍然需要显示
    const roundScore = typeof player.roundScore === 'number' ? player.roundScore : 0;
    const totalScore = typeof player.score === 'number' ? player.score : 0;

    return (
        <div className={`comparison-cell ${isHuman ? 'human-player-cell' : 'ai-player-cell'}`}>
            <h4>
                {player.name} 
                <span className="score-summary">(本局: {roundScore >= 0 ? '+' : ''}{roundScore} | 总: {totalScore >= 0 ? '+' : ''}{totalScore})</span>
            </h4>
            <div className="comparison-hand-row">
                {/* 移除牌型文字说明，只留 "头道:" */}
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
            {/* 打枪信息可以保留 */}
            {player.comparisonResults && Object.entries(player.comparisonResults).map(([opponentId, res]) => {
                const opponent = players.find(p=>p.id === opponentId);
                if (res.details && res.details.some(d => d.toLowerCase().includes("打枪")) && res.score !== 0) {
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

const ComparisonModal = ({ isOpen, onClose, players, humanPlayerId, onContinueGame }) => {
  if (!isOpen || !players || players.length === 0) {
    return null;
  }

  const humanPlayer = players.find(p => p.id === humanPlayerId);
  const aiOpponents = players.filter(p => p.id !== humanPlayerId);
  
  return (
    <div className="modal-overlay" /*onClick={onClose} // 点击遮罩层不再关闭，必须点按钮*/>
      <div className="modal-content comparison-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>×</button>
        <h2>本局比牌结果</h2>
        <div className="comparison-grid">
            {humanPlayer    ? <PlayerComparisonCell player={humanPlayer}    isHuman={true}  players={players} /> : <div className="comparison-cell empty"><span>真人玩家</span></div>}
            {aiOpponents[0] ? <PlayerComparisonCell player={aiOpponents[0]} isHuman={false} players={players} /> : <div className="comparison-cell empty"><span>AI ①</span></div>}
            {aiOpponents[1] ? <PlayerComparisonCell player={aiOpponents[1]} isHuman={false} players={players} /> : <div className="comparison-cell empty"><span>AI ②</span></div>}
            {aiOpponents[2] ? <PlayerComparisonCell player={aiOpponents[2]} isHuman={false} players={players} /> : <div className="comparison-cell empty"><span>AI ③</span></div>}
        </div>
        <div className="modal-actions">
            {/* 添加 "继续游戏" 按钮 */}
            <button className="game-button continue-game-button" onClick={onContinueGame}>继续游戏 (开始新一局)</button>
            {/* 保留一个独立的关闭按钮，或者让继续游戏按钮兼具关闭功能 */}
            {/* <button className="game-button modal-close-btn-bottom" onClick={onClose}>关闭</button> */}
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
