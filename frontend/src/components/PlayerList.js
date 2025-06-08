import React from 'react';

const PlayerList = ({ players }) => {
  // 模拟玩家数据
  const samplePlayers = [
    { id: 1, name: '玩家1', points: 1200 },
    { id: 2, name: '玩家2', points: 850 },
    { id: 3, name: '玩家3', points: 2100 },
    { id: 4, name: '玩家4', points: 1500 },
  ];
  
  return (
    <div className="player-list">
      <h3>在线玩家</h3>
      <ul>
        {samplePlayers.map(player => (
          <li key={player.id}>
            <span>{player.name}</span>
            <span>积分: {player.points}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlayerList;
