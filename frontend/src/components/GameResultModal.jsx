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

function getScoreAgainstMe(me, other, gameType) {
    if (!me || !other || !me.hand || !other.hand) return 0;

    const p1Hand = {
        head: me.hand.top || [],
        middle: me.hand.middle || [],
        tail: me.hand.bottom || [],
    };
    const p2Hand = {
        head: other.hand.top || [],
        middle: other.hand.middle || [],
        tail: other.hand.bottom || [],
    };

    if (gameType === 'eight') {
        return calculateSinglePairScoreForEight(p1Hand, p2Hand);
    }

    // SSS requires string conversion
    return calculateSinglePairScore(
        {
            head: p1Hand.head.map(c => `${c.rank}_of_${c.suit}`),
            middle: p1Hand.middle.map(c => `${c.rank}_of_${c.suit}`),
            tail: p1Hand.tail.map(c => `${c.rank}_of_${c.suit}`),
        },
        {
            head: p2Hand.head.map(c => `${c.rank}_of_${c.suit}`),
            middle: p2Hand.middle.map(c => `${c.rank}_of_${c.suit}`),
            tail: p2Hand.tail.map(c => `${c.rank}_of_${c.suit}`),
        }
    );
}

const GameResultModal = ({ result, onClose, gameType }) => {
    if (!result || !result.players || result.players.length === 0) return null;

    // Find the main player ("me")
    const me = result.players.find(p => p.id === result.myId) || result.players[0];
    const others = result.players.filter(p => p.id !== me.id);

    const myTotalScore = me.score || 0;

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

                    {others.map((player) => {
                        // The backend score is the final truth. We show that directly.
                        // The frontend recalculation is just for the per-player breakdown view.
                        const vsScore = getScoreAgainstMe(me, player, gameType);
                        return (
                            <div key={player.id} className="result-player-column">
                                <h3>{`玩家 ${player.name.slice(-4)}`} <span className={vsScore > 0 ? 'score-win' : (vsScore < 0 ? 'score-loss' : '')}>({vsScore > 0 ? `+${vsScore}` : vsScore})</span></h3>
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