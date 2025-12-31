import React, { useEffect, useState } from 'react';
import Hand from './Hand';
import Card from './Card';
import { useGame } from '../context/GameContext';

const GameTable = ({ 
  players = [],
  currentPlayer = 0,
  onCardSelect = null,
  selectedCards = [],
  gameStatus = 'waiting',
  onStartGame = null
}) => {
  const { gameState } = useGame();
  const [centerCards, setCenterCards] = useState([]);
  const [timer, setTimer] = useState(30);
  
  useEffect(() => {
    let interval;
    if (gameStatus === 'playing' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStatus, timer]);
  
  useEffect(() => {
    if (timer === 0 && gameStatus === 'playing') {
      // 自动出牌或弃牌逻辑
      console.log('时间到！');
    }
  }, [timer, gameStatus]);
  
  // 模拟中心牌区
  useEffect(() => {
    if (gameState?.center_cards) {
      setCenterCards(gameState.center_cards);
    }
  }, [gameState]);
  
  const playerPositions = [
    { top: '10%', left: '50%', transform: 'translateX(-50%)' }, // 上
    { top: '50%', right: '10%', transform: 'translateY(-50%)' }, // 右
    { bottom: '10%', left: '50%', transform: 'translateX(-50%)' }, // 下
    { top: '50%', left: '10%', transform: 'translateY(-50%)' }  // 左
  ];
  
  return (
    <div className="relative w-full h-[600px] bg-gradient-to-br from-green-900 to-green-700 rounded-3xl shadow-2xl overflow-hidden">
      {/* 桌面纹理 */}
      <div className="absolute inset-0 bg-green-800 opacity-90">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0,_rgba(0,0,0,0.3)_100%)]"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-yellow-500 border-dashed rounded-full opacity-50"></div>
      </div>
      
      {/* 游戏状态指示器 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex items-center space-x-4">
          <div className={`
            px-4 py-2 rounded-full text-white font-bold
            ${gameStatus === 'waiting' ? 'bg-blue-600' : 
              gameStatus === 'playing' ? 'bg-green-600' : 
              'bg-purple-600'}
          `}>
            {gameStatus === 'waiting' ? '等待中' : 
             gameStatus === 'playing' ? '游戏中' : 
             '已结束'}
          </div>
          
          {gameStatus === 'playing' && (
            <div className="bg-red-600 text-white px-4 py-2 rounded-full font-bold">
              倒计时: {timer}s
            </div>
          )}
        </div>
      </div>
      
      {/* 玩家位置 */}
      {players.map((player, index) => (
        <div 
          key={player.id}
          className="absolute"
          style={playerPositions[index]}
        >
          <Hand
            cards={player.cards || []}
            playerName={player.name}
            isCurrentPlayer={index === currentPlayer}
            onCardClick={(cardIndex) => onCardSelect && onCardSelect(index, cardIndex)}
            selectedCards={selectedCards}
            disabled={gameStatus !== 'playing' || index !== currentPlayer}
            orientation={index === 1 || index === 3 ? 'vertical' : 'horizontal'}
          />
        </div>
      ))}
      
      {/* 中心牌区 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="flex flex-col items-center space-y-4">
          {/* 牌堆 */}
          <div className="relative">
            <Card size="lg" showBack className="shadow-xl" />
            <div className="absolute top-0 left-0 mt-2 ml-2">
              <Card size="lg" showBack className="shadow-xl" />
            </div>
            <div className="absolute top-0 left-0 mt-4 ml-4">
              <Card size="lg" showBack className="shadow-xl" />
            </div>
          </div>
          
          {/* 已出的牌 */}
          {centerCards.length > 0 && (
            <div className="flex space-x-2">
              {centerCards.map((card, index) => (
                <div 
                  key={index}
                  className="transform transition-transform duration-300 hover:-translate-y-2"
                >
                  <Card 
                    cardCode={card} 
                    size="md"
                    className="shadow-lg"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* 游戏控制按钮 */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        {gameStatus === 'waiting' && onStartGame && (
          <button
            onClick={onStartGame}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            开始游戏
          </button>
        )}
        
        {gameStatus === 'playing' && (
          <div className="flex space-x-4">
            <button className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition">
              出牌
            </button>
            <button className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg shadow hover:bg-red-700 transition">
              弃牌
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white font-bold rounded-lg shadow hover:bg-gray-700 transition">
              提示
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameTable;