import React, { useState, useEffect } from 'react';
import Card from './Card';
import Hand from './Hand';
import PointSystem from './PointSystem';
import PlayerList from './PlayerList';
import RegisterModal from './RegisterModal';
import LoginModal from './LoginModal';
import { AI } from '../utils/ai';

const GameTable = () => {
  const [user, setUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [hand, setHand] = useState([]);
  const [arrangedHand, setArrangedHand] = useState({ front: [], middle: [], back: [] });
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [gameStatus, setGameStatus] = useState('waiting');
  
  // 初始化游戏
  const initGame = () => {
    // 模拟获取玩家手牌
    const newHand = generateRandomHand();
    setHand(newHand);
    autoArrange(newHand);
    setGameStatus('playing');
  };
  
  // 生成随机手牌
  const generateRandomHand = () => {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    
    const deck = [];
    suits.forEach(suit => {
      ranks.forEach(rank => {
        deck.push(`${rank}_of_${suit}`);
      });
    });
    
    // 洗牌
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck.slice(0, 13);
  };
  
  // 自动分牌
  const autoArrange = (cards) => {
    const aiResult = AI.arrangeCards(cards);
    setArrangedHand(aiResult);
  };
  
  // 手动调整牌组
  const moveCard = (fromGroup, fromIndex, toGroup, toIndex) => {
    const newArrangedHand = {...arrangedHand};
    const [movedCard] = newArrangedHand[fromGroup].splice(fromIndex, 1);
    
    if (toIndex >= newArrangedHand[toGroup].length) {
      newArrangedHand[toGroup].push(movedCard);
    } else {
      newArrangedHand[toGroup].splice(toIndex, 0, movedCard);
    }
    
    setArrangedHand(newArrangedHand);
  };
  
  // 提交牌组
  const submitHand = () => {
    if (arrangedHand.front.length !== 3 || arrangedHand.middle.length !== 5 || arrangedHand.back.length !== 5) {
      alert('请正确分组：前墩3张，中墩5张，后墩5张');
      return;
    }
    
    // 计算得分逻辑
    const score = calculateScore(arrangedHand);
    
    // 更新游戏状态
    setGameStatus('scoring');
    setTimeout(() => {
      setGameStatus('completed');
      
      // 更新用户积分
      if (user) {
        setUser({
          ...user,
          points: user.points + score.total
        });
      }
    }, 3000);
  };
  
  // 计算得分
  const calculateScore = (hand) => {
    // 这里实现实际的得分计算逻辑
    const frontScore = AI.evaluateHand(hand.front).value;
    const middleScore = AI.evaluateHand(hand.middle).value;
    const backScore = AI.evaluateHand(hand.back).value;
    
    // 验证牌型是否符合规则
    if (backScore < middleScore || middleScore < frontScore) {
      return {
        front: 0,
        middle: 0,
        back: 0,
        total: 0,
        message: "牌型不符合规则: 后墩 > 中墩 > 前墩"
      };
    }
    
    const total = frontScore + middleScore + backScore;
    
    return {
      front: frontScore,
      middle: middleScore,
      back: backScore,
      total: total,
      message: "牌型有效"
    };
  };
  
  // 用户注册
  const handleRegister = (phone, password) => {
    // 在实际应用中，这里会调用API
    setUser({ id: 1, phone, points: 1000 });
    setShowRegister(false);
  };
  
  // 用户登录
  const handleLogin = (phone, password) => {
    // 在实际应用中，这里会调用API
    setUser({ id: 1, phone, points: 1000 });
    setShowLogin(false);
  };
  
  // 赠送积分
  const handleSendPoints = (receiverId, amount) => {
    // 在实际应用中，这里会调用API
    if (user.points >= amount) {
      setUser({...user, points: user.points - amount});
      alert(`成功赠送 ${amount} 积分给 ${receiverId}`);
    } else {
      alert('积分不足');
    }
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>十三水游戏</h1>
        <div className="user-info">
          {user ? (
            <>
              <span>欢迎, {user.phone}</span>
              <span>积分: {user.points}</span>
              <button onClick={() => setUser(null)}>退出</button>
            </>
          ) : (
            <>
              <button onClick={() => setShowLogin(true)}>登录</button>
              <button onClick={() => setShowRegister(true)}>注册</button>
            </>
          )}
        </div>
      </div>
      
      <div className="game-table">
        <PlayerList players={players} />
        
        <div className="game-area">
          {gameStatus === 'waiting' && (
            <div className="game-start">
              <button onClick={initGame} className="start-button">开始游戏</button>
            </div>
          )}
          
          {gameStatus === 'playing' && (
            <>
              <div className="hand-arrangement">
                <Hand 
                  title="后墩 (5张)" 
                  cards={arrangedHand.back} 
                  group="back"
                  onMoveCard={moveCard}
                />
                <Hand 
                  title="中墩 (5张)" 
                  cards={arrangedHand.middle} 
                  group="middle"
                  onMoveCard={moveCard}
                />
                <Hand 
                  title="前墩 (3张)" 
                  cards={arrangedHand.front} 
                  group="front"
                  onMoveCard={moveCard}
                />
              </div>
              
              <div className="player-hand">
                <h3>你的手牌</h3>
                <div className="cards">
                  {hand.map((card, index) => (
                    <Card key={index} card={card} />
                  ))}
                </div>
              </div>
              
              <div className="game-controls">
                <button onClick={() => autoArrange(hand)} className="ai-button">
                  AI分牌
                </button>
                <button onClick={submitHand} className="submit-button">
                  提交牌组
                </button>
              </div>
            </>
          )}
          
          {gameStatus === 'scoring' && (
            <div className="scoring">
              <h2>计算分数中...</h2>
            </div>
          )}
          
          {gameStatus === 'completed' && (
            <div className="game-completed">
              <h2>游戏结束!</h2>
              <button onClick={initGame} className="play-again">再来一局</button>
            </div>
          )}
        </div>
        
        <PointSystem 
          user={user} 
          onSendPoints={handleSendPoints} 
        />
      </div>
      
      {showRegister && (
        <RegisterModal 
          onClose={() => setShowRegister(false)}
          onRegister={handleRegister}
        />
      )}
      
      {showLogin && (
        <LoginModal 
          onClose={() => setShowLogin(false)}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
};

export default GameTable;
