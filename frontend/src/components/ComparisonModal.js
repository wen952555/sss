import React from 'react';
import StaticCard from './StaticCard';

// 展开横向显示所有牌面（无重叠，理牌区风格）
const renderExpandedCards = (cards) => {
  // 响应式宽度
  let cardWidth = 80, cardHeight = 96, gap = 8;
  if (window.innerWidth < 700) {
    cardWidth = 38; cardHeight = 48; gap = 4;
  } else if (window.innerWidth < 1200) {
    cardWidth = 56; cardHeight = 68; gap = 6;
  }
  return (
    <div
      className="mini-cards"
      style={{
        display: 'flex',
        gap: `${gap}px`,
        alignItems: 'center',
        position: 'relative',
        height: `${cardHeight}px`,
        minHeight: `${cardHeight}px`,
      }}
    >
      {cards.map((c, i) => (
        <StaticCard
          key={c.id + '_static'}
          cardData={c}
          style={{
            width: `${cardWidth}px`,
            height: `${cardHeight}px`,
            position: 'relative',
          }}
        />
      ))}
    </div>
  );
};

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
          {renderExpandedCards(topCards)}
        </div>
        <div className="comparison-hand-row">
          <strong>中道:</strong>
          {renderExpandedCards(middleCards)}
        </div>
        <div className="comparison-hand-row">
          <strong>尾道:</strong>
          {renderExpandedCards(bottomCards)}
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
