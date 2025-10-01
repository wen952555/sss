// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import PlayerHand from './components/PlayerHand';
import './App.css';

// 使用环境变量连接后端
const socket = io(import.meta.env.VITE_BACKEND_URL);

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [myHand, setMyHand] = useState([]);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      console.log('成功连接到后端服务器!');
    }

    function onDisconnect() {
      setIsConnected(false);
      console.log('与后端服务器断开连接。');
    }

    function onDealHand(hand) {
      console.log('收到手牌:', hand);
      // TODO: 在这里可以添加排序逻辑
      setMyHand(hand);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('deal_hand', onDealHand);

    // 清理函数
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('deal_hand', onDealHand);
    };
  }, []);

  const handleStartGame = () => {
    if (isConnected) {
      socket.emit('start_game');
    } else {
      alert('尚未连接到服务器！');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>十三水游戏</h1>
        <p>服务器连接状态: {isConnected ? '已连接' : '未连接'}</p>
        <button onClick={handleStartGame} disabled={!isConnected || myHand.length > 0}>
          {myHand.length > 0 ? '已发牌' : '开始游戏/发牌'}
        </button>
      </header>
      <main className="game-board">
        <PlayerHand cards={myHand} />
      </main>
    </div>
  );
}

export default App;
