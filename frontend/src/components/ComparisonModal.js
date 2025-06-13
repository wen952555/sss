// frontend/src/components/ComparisonModal.js
import React from 'react';
import StaticCard from './StaticCard';

const PlayerComparisonCell = ({ player, isHuman, players }) => {
    if (!player || !player.finalArrangement) {
        return <div className="comparison-cell empty"><span>等待数据...</span></div>;
    }
    const topCards = (player.cards && Array.isArray(player.cards.TOP)) ? player.cards.TOP : [];
    const middleCards = (player.cards && Array.isArray(player.cards.MIDDLE)) ? player.cards.MIDDLE : [];
    const bottomCards = (player.cards && Array.isArray(player.cards.BOTTOM)) ? player.cards.BOTTOM : [];
    const roundScore = typeof player.roundScore === 'number' ? player.roundScore : 0;
    const totalScore = typeof player.score === 'number' ? player.score : 0;

    return (
        <div className={`comparison-cell ${isHuman ? 'human-player-cell' : 'ai-player-cell'}`}>
            <h4> {player.name} <span className="score-summary">(本局: {roundScore >= 0 ? '+' : ''}{roundScore} | 总: {totalScore >= 0 ? '+' : ''}{totalScore})</span> </h4>
            <div className="comparison-hand-verticals">
              <div className="comparison-hand-row">
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
            </div>
            {/* 打枪信息 */}
            {player.comparisonResults && Object.entries(player.comparisonResults).map(([opponentId, res]) => {
              const opponent = players.find(p=>p.id === opponentId);
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

// 固定田字型顺序（2x2）：前两为上排，后两为下排
const get2x2GridOrder = (players, humanPlayerId) => {
  // 保证最多4人。如果不足4人则补空位
  const human = players.find(p => p.id === humanPlayerId);
  const ais = players.filter(p => p.id !== humanPlayerId);
  let order = [];
  if (human) order.push(human);
  order = order.concat(ais.slice(0, 3));
  while (order.length < 4) order.push(null);
  return [
    order[0], order[1],
    order[2], order[3]
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
              ? <PlayerComparisonCell key={p.id} player={p} isHuman={p.id === humanPlayerId} players={players} />
              : <div className="comparison-cell empty" key={idx}><span>玩家</span></div>
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
