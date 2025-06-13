// frontend/src/components/ComparisonModal.js
import React from 'react';
import StaticCard from './StaticCard';
// import { HAND_TYPE_NAMES } from '../logic/handEvaluator'; // 已移除

// const getTypeName = (typeNum) => HAND_TYPE_NAMES[typeNum] || '未知'; // 已移除

const PlayerComparisonCell = ({ player, isHuman, players }) => {
    if (!player || !player.finalArrangement) {
        return <div className="comparison-cell empty"><span>等待数据...</span></div>;
    }
    const topCards = (player.cards && Array.isArray(player.cards.TOP)) ? player.cards.TOP : [];
    const middleCards = (player.cards && Array.isArray(player.cards.MIDDLE)) ? player.cards.MIDDLE : [];
    const bottomCards = (player.cards && Array.isArray(player.cards.BOTTOM)) ? player.cards.BOTTOM : [];
    const roundScore = typeof player.roundScore === 'number' ? player.roundScore : 0;
    const totalScore = typeof player.score === 'number' ? player.score : 0;

    // renderExpandedCards 函数现在是 ComparisonModal 的一部分，或者从外部导入
    // 为简化，我们假设 renderExpandedCards 的逻辑是正确的，并且 StaticCard 能接收 style prop
    const renderPlayerHandCards = (cards) => {
        // 根据您提供的JS，这里应该调用您在ComparisonModal.js中定义的renderExpandedCards
        // 但为了让这个组件独立，我们先用简单的map
        // 或者，您需要将 renderExpandedCards 提升到更高层级或作为工具函数导入
        let cardWidth = 30, cardHeight = 42, gap = 2; // 默认小尺寸
        // 实际应用中，这些尺寸应与CSS中 .comparison-cell .static-card 协调
        // 或者完全由JS动态计算，如您之前提供的 renderExpandedCards

        return (
            <div className="mini-cards" style={{ display: 'flex', gap: `${gap}px`, height: `${cardHeight}px`, justifyContent: 'flex-start' }}>
                {cards.map(c => (
                    <StaticCard 
                        key={c.id + '_modal_static'} 
                        cardData={c} 
                        style={{ width: `${cardWidth}px`, height: `${cardHeight}px` }}
                    />
                ))}
            </div>
        );
    };


    return (
        <div className={`comparison-cell ${isHuman ? 'human-player-cell' : 'ai-player-cell'}`}>
            <h4> {player.name} <span className="score-summary">(本局: {roundScore >= 0 ? '+' : ''}{roundScore} | 总: {totalScore >= 0 ? '+' : ''}{totalScore})</span> </h4>
            <div className="comparison-hand-verticals"> {/* 使用您CSS中的类名 */}
                <div className="comparison-hand-row"> <strong>头道:</strong> {renderPlayerHandCards(topCards)} </div>
                <div className="comparison-hand-row"> <strong>中道:</strong> {renderPlayerHandCards(middleCards)} </div>
                <div className="comparison-hand-row"> <strong>尾道:</strong> {renderPlayerHandCards(bottomCards)} </div>
            </div>
            {player.comparisonResults && Object.entries(player.comparisonResults).map(([opponentId, res]) => { const opponent = players.find(p=>p.id === opponentId); if (res.details && Array.isArray(res.details) && res.details.some(d => d.toLowerCase().includes("打枪")) && res.score !== 0) { return ( <p key={`${player.id}_vs_${opponentId}_shoot`} className={`shoot-info ${res.score > 0 ? 'positive-shoot' : 'negative-shoot'}`}> {res.score > 0 ? `打枪 ${opponent?.name || '对手'}!` : `被 ${opponent?.name || '对手'} 打枪!`} </p> ); } return null; })}
        </div>
    );
};

// 固定田字型顺序（2x2）：前两为上排，后两为下排
const get2x2GridOrder = (players, humanPlayerId) => {
  const human = players.find(p => p.id === humanPlayerId);
  const ais = players.filter(p => p.id !== humanPlayerId);
  let order = [];
  if (human) order.push(human);
  // 将AI玩家填充到剩余位置，确保最多3个AI
  order = order.concat(ais.slice(0, Math.min(3, ais.length))); 
  // 如果总玩家数不足4，用null填充
  while (order.length < 4) order.push(null); 
  // 返回田字格顺序
  return [
    order[0], order[1], // 上排
    order[2], order[3]  // 下排
  ];
};

const ComparisonModal = ({ onClose, players, humanPlayerId, onContinueGame }) => {
  if (!players || players.length === 0) return null;
  const gridOrder = get2x2GridOrder(players, humanPlayerId);

  return (
    <div className="comparison-view-container"> 
      <div className="modal-content comparison-modal-content">
        <button className="modal-close-button top-right-close" onClick={onClose}>×</button>
        <h2>本局比牌结果</h2>
        <div className="comparison-grid">
          {gridOrder.map((p, idx) =>
            p
              ? <PlayerComparisonCell key={p.id || `player_cell_${idx}`} player={p} isHuman={p.id === humanPlayerId} players={players} />
              : <div className="comparison-cell empty" key={`empty_cell_${idx}`}><span></span></div>
          )}
        </div>
        <div className="modal-actions">
          <button className="game-button continue-game-button" onClick={onContinueGame}>继续游戏</button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
