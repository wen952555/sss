import React from 'react';
import Card from './Card';
import './GameResultModal.css';
import { calculateSinglePairScore } from '../utils/sssScorer';
import { calculateSinglePairScoreForEight } from '../utils/eightCardScorer';

const PlayerHandDisplay = ({ hand }) => {
  if (!hand || !hand.top || !hand.middle || !hand.bottom) return null;
  const lanes = [hand.top, hand.middle, hand.bottom];
  return (
    <div className="result-hand-container">
      {lanes.map((laneCards, idx) => (
        <div key={idx} className="result-cards-row">
          {laneCards && laneCards.map((card, cardIdx) => (
            <Card key={`${card.rank}-${card.suit}-${cardIdx}`} card={card} />
          ))}
        </div>
      ))}
    </div>
  );
};

function getScoreAgainstMe(me, other, gameType = 'thirteen') {
  if (!me || !other) return 0;
  if (gameType === 'eight') {
    return calculateSinglePairScoreForEight(
      {
        head: me.hand.top,
        middle: me.hand.middle,
        tail: me.hand.bottom
      },
      {
        head: other.hand.top,
        middle: other.hand.middle,
        tail: other.hand.bottom
      }
    );
  }
  return calculateSinglePairScore(
    {
      head: me.hand.top.map(c => `${c.rank}_of_${c.suit}`),
      middle: me.hand.middle.map(c => `${c.rank}_of_${c.suit}`),
      tail: me.hand.bottom.map(c => `${c.rank}_of_${c.suit}`),
    },
    {
      head: other.hand.top.map(c => `${c.rank}_of_${c.suit}`),
      middle: other.hand.middle.map(c => `${c.rank}_of_${c.suit}`),
      tail: other.hand.bottom.map(c => `${c.rank}_of_${c.suit}`),
    }
  );
}

const GameResultModal = ({ result, onClose }) => {
  if (!result || !result.players || result.players.length === 0) return null;
  const myIdx = result.players.findIndex(p => p.is_self || (p.is_me) || p.name === '你' || (p.phone && p.phone === result.mePhone));
  const me = myIdx >= 0 ? result.players[myIdx] : result.players[0];
  const isEight = me.hand.top.length + me.hand.middle.length + me.hand.bottom.length === 8;
  const gameType = isEight ? 'eight' : 'thirteen';

  return (
    <div className="modal-backdrop">
      <div className="modal-content result-modal-content" style={{ maxWidth: '96vw', margin: '0 auto', overflowY: 'auto' }}>
        <h3>比牌结果</h3>
        <div className="game-result-grid">
          {result.players.map((player, index) => {
            if (player === me) return null;
            const vsScore = getScoreAgainstMe(me, player, gameType);
            const color = vsScore > 0 ? '#27ae60' : vsScore < 0 ? '#c0392b' : '#34495e';
            return (
              <div key={index} className="game-result-grid-item">
                <div className="result-player-header">
                  <span className="result-player-name">
                    {player.name ? `玩家 ${player.name.slice(-4)}` : `玩家 ${index + 1}`}
                  </span>
                  <span className="result-player-score" style={{ color }}>
                    {vsScore > 0 ? `+${vsScore}` : vsScore}
                  </span>
                </div>
                <PlayerHandDisplay hand={player.hand} />
              </div>
            );
          })}
        </div>
        <button onClick={onClose} className="close-button">返回大厅</button>
      </div>
    </div>
  );
};

export default GameResultModal;