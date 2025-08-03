import React from 'react';
import Card from './Card';

const ThirteenGame = ({ playerHand, otherPlayers }) => {
  // 这里将是十三张游戏的逻辑和UI
  // 目前只是一个占位符，显示玩家手牌
  return (
    <div className="thirteen-game">
      <h2>十三张游戏</h2>
      <div className="player-hand">
        <h3>你的手牌:</h3>
        <div className="card-container">
          {playerHand.map((card, index) => (
            <Card key={index} card={card} />
          ))}
        </div>
      </div>

      {/* 可以选择在这里显示其他玩家的牌背或者简略信息 */}
      {/* <h3>其他玩家:</h3>
      {Object.entries(otherPlayers).map(([player, hand]) => (
        <div key={player} className="other-player-hand">
          <h4>{player} ({hand.length} 张牌)</h4>
        </div>
      ))} */}
    </div>
  );
};

export default ThirteenGame;
