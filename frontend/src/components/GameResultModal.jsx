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

  const myIdx = result.players.findIndex(p => p.is_self || p.is_me || p.name === '你' || (p.phone && p.phone === result.mePhone));
  const me = myIdx !== -1 ? result.players[myIdx] : result.players[0];
  const others = result.players.filter((p, index) => index !== myIdx);

  const totalScore = result.players.reduce((acc, p) => acc + (p.score || 0), 0);
  const myTotalScore = me.score || 0;

  const getLaneComparison = (myLane, otherLane) => {
    // This is a placeholder for actual lane comparison logic
    // You would need to implement or import a function to compare two lanes
    return { result: 'win', score: 1 };
  };

  return (
    <div className="result-modal-backdrop">
      <div className="result-modal-container">
        <div className="result-modal-header">
          <h2>{myTotalScore > 0 ? '恭喜胜利' : (myTotalScore < 0 ? '惜败' : '平局')}</h2>
          <p>总分: <span className={myTotalScore > 0 ? 'score-win' : (myTotalScore < 0 ? 'score-loss' : '')}>{myTotalScore > 0 ? `+${myTotalScore}` : myTotalScore}</span></p>
        </div>

        <div className="result-modal-body">
          <div className="result-player-column is-me">
            <h3>你的牌</h3>
            <PlayerHandDisplay hand={me.hand} />
          </div>

          {others.map((player, index) => {
            const vsScore = getScoreAgainstMe(me, player, 'thirteen'); // Assuming thirteen for now
            return (
              <div key={index} className="result-player-column">
                <h3>{`玩家 ${player.phone.slice(-4)}`} <span className={vsScore > 0 ? 'score-win' : (vsScore < 0 ? 'score-loss' : '')}>({vsScore > 0 ? `+${vsScore}` : vsScore})</span></h3>
                <PlayerHandDisplay hand={player.hand} />
              </div>
            );
          })}
        </div>

        <div className="result-modal-footer">
          <button onClick={onClose} className="result-btn exit-btn">退出游戏</button>
          <button onClick={onClose} className="result-btn continue-btn">继续游戏</button>
        </div>
      </div>
    </div>
  );
};

export default GameResultModal;