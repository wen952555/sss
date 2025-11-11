import React from 'react';
import Card from './Card';
import { evaluateHand, HAND_TYPES } from '../utils/gameLogic';

const CardComparison = ({ players, onClose, currentPlayerId }) => {
  if (!players || players.length === 0) return null;

  // 计算每道牌的胜负
  const calculateResults = () => {
    const results = {
      top: [],
      middle: [],
      bottom: []
    };

    // 评估每个玩家的各道牌
    const evaluatedPlayers = players.map(player => ({
      ...player,
      evaluations: {
        top: evaluateHand(player.hand.top),
        middle: evaluateHand(player.hand.middle),
        bottom: evaluateHand(player.hand.bottom)
      }
    }));

    // 比较头道
    results.top = compareLane(evaluatedPlayers, 'top');
    
    // 比较中道
    results.middle = compareLane(evaluatedPlayers, 'middle');
    
    // 比较尾道
    results.bottom = compareLane(evaluatedPlayers, 'bottom');

    return { evaluatedPlayers, results };
  };

  // 比较单道牌
  const compareLane = (players, lane) => {
    const lanePlayers = players.map(player => ({
      id: player.id,
      name: player.name,
      evaluation: player.evaluations[lane],
      cards: player.hand[lane]
    }));

    // 找出胜者
    let winners = [lanePlayers[0]];
    
    for (let i = 1; i < lanePlayers.length; i++) {
      const comparison = compareEvaluations(winners[0].evaluation, lanePlayers[i].evaluation);
      if (comparison < 0) {
        winners = [lanePlayers[i]];
      } else if (comparison === 0) {
        winners.push(lanePlayers[i]);
      }
    }

    return { players: lanePlayers, winners: winners.map(w => w.id) };
  };

  // 比较两个评估结果
  const compareEvaluations = (eval1, eval2) => {
    if (eval1.rank !== eval2.rank) {
      return eval2.rank - eval1.rank;
    }

    // 相同牌型，比较关键牌
    switch (eval1.type) {
      case HAND_TYPES.STRAIGHT_FLUSH:
      case HAND_TYPES.STRAIGHT:
        return eval2.highCard - eval1.highCard;
        
      case HAND_TYPES.FOUR_OF_A_KIND:
        if (eval1.value !== eval2.value) return eval2.value - eval1.value;
        break;
        
      case HAND_TYPES.FULL_HOUSE:
        if (eval1.threeValue !== eval2.threeValue) return eval2.threeValue - eval1.threeValue;
        if (eval1.twoValue !== eval2.twoValue) return eval2.twoValue - eval1.twoValue;
        break;
        
      case HAND_TYPES.FLUSH:
      case HAND_TYPES.HIGH_CARD:
        return eval2.highCard - eval1.highCard;
        
      case HAND_TYPES.THREE_OF_A_KIND:
        if (eval1.value !== eval2.value) return eval2.value - eval1.value;
        break;
        
      case HAND_TYPES.TWO_PAIR:
        if (eval1.highPair !== eval2.highPair) return eval2.highPair - eval1.highPair;
        if (eval1.lowPair !== eval2.lowPair) return eval2.lowPair - eval1.lowPair;
        break;
        
      case HAND_TYPES.PAIR:
        if (eval1.value !== eval2.value) return eval2.value - eval1.value;
        break;
    }

    return 0;
  };

  const { evaluatedPlayers, results } = calculateResults();

  // 计算总分
  const calculateTotalScores = () => {
    const scores = {};
    
    evaluatedPlayers.forEach(player => {
      scores[player.id] = 0;
      
      // 头道得分
      if (results.top.winners.includes(player.id)) {
        scores[player.id] += 1;
      }
      
      // 中道得分
      if (results.middle.winners.includes(player.id)) {
        scores[player.id] += 1;
      }
      
      // 尾道得分
      if (results.bottom.winners.includes(player.id)) {
        scores[player.id] += 1;
      }
      
      // 全垒打奖励（赢下所有三道）
      if (results.top.winners.includes(player.id) && 
          results.middle.winners.includes(player.id) && 
          results.bottom.winners.includes(player.id)) {
        scores[player.id] += 3;
      }
    });
    
    return scores;
  };

  const totalScores = calculateTotalScores();

  return (
    <div className="comparison-modal">
      <div className="comparison-content">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2>比牌结果</h2>
          <button 
            className="game-button"
            onClick={onClose}
            style={{ background: '#e74c3c' }}
          >
            关闭
          </button>
        </div>

        {evaluatedPlayers.map(player => {
          const isCurrentPlayer = player.id === currentPlayerId;
          const playerScore = totalScores[player.id] || 0;
          const isWinner = playerScore > 0;
          
          return (
            <div 
              key={player.id}
              className={`player-comparison ${isWinner ? 'player-winner' : ''}`}
              style={{ 
                borderLeft: isCurrentPlayer ? '4px solid #3498db' : 'none'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <h3 style={{ margin: 0 }}>
                  {player.name} {isCurrentPlayer && '(你)'}
                </h3>
                <div style={{ 
                  background: isWinner ? '#27ae60' : '#e74c3c',
                  color: 'white',
                  padding: '5px 10px',
                  borderRadius: '15px',
                  fontWeight: 'bold'
                }}>
                  得分: {playerScore}
                </div>
              </div>

              {/* 头道 */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '5px'
                }}>
                  <span>头道: {player.evaluations.top.type}</span>
                  {results.top.winners.includes(player.id) && (
                    <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✓ 胜出</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                  {player.hand.top.map((card, index) => (
                    <Card key={index} cardCode={card} size="small" />
                  ))}
                </div>
              </div>

              {/* 中道 */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '5px'
                }}>
                  <span>中道: {player.evaluations.middle.type}</span>
                  {results.middle.winners.includes(player.id) && (
                    <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✓ 胜出</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                  {player.hand.middle.map((card, index) => (
                    <Card key={index} cardCode={card} size="small" />
                  ))}
                </div>
              </div>

              {/* 尾道 */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '5px'
                }}>
                  <span>尾道: {player.evaluations.bottom.type}</span>
                  {results.bottom.winners.includes(player.id) && (
                    <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✓ 胜出</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                  {player.hand.bottom.map((card, index) => (
                    <Card key={index} cardCode={card} size="small" />
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ 
          marginTop: '20px', 
          padding: '15px',
          background: '#2c3e50',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3>游戏规则</h3>
          <ul style={{ textAlign: 'left', fontSize: '0.9rem' }}>
            <li>每道胜出得1分</li>
            <li>全垒打（赢下所有三道）额外得3分</li>
            <li>尾道必须大于中道，中道必须大于头道</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CardComparison;