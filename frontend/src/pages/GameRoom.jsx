import React, { useState, useEffect } from 'react';
import CardArea from '../components/CardArea';
import { validateCardArrangement } from '../utils/cardUtils';
import { gameAPI } from '../utils/api';

const GameRoom = ({ roomType, userInfo, onExit }) => {
  const [arrangedCards, setArrangedCards] = useState({
    head: [],
    middle: [],
    tail: []
  });
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, submitted
  const [roomInfo, setRoomInfo] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);

  // 初始化游戏
  const initGame = async () => {
    try {
      const result = await gameAPI.getGame(roomType);
      if (result.success) {
        setCurrentGame(result);
        
        // 直接使用后端预设的理牌结果
        setArrangedCards(result.preset_arrangement);
        setGameStatus('playing');
        
        // 模拟创建房间
        setRoomInfo({
          id: result.game_id,
          type: roomType,
          players: 1,
          maxPlayers: 4
        });
      } else {
        alert('获取牌局失败：' + result.message);
      }
    } catch (error) {
      alert('获取牌局失败：' + error.message);
    }
  };

  // 提交牌型
  const handleSubmit = async () => {
    // 检查是否所有牌都已分配
    const totalArranged = arrangedCards.head.length + arrangedCards.middle.length + arrangedCards.tail.length;
    if (totalArranged !== 13) {
      alert('请确保13张牌全部分配到三道中！');
      return;
    }

    if (!validateCardArrangement(arrangedCards.head, arrangedCards.middle, arrangedCards.tail)) {
      alert('牌型不符合规则！请确保：头道 ≤ 中道 ≤ 尾道');
      return;
    }

    try {
      // 提交牌型
      const result = await gameAPI.submitCards(currentGame.game_id, arrangedCards);
      
      if (result.success) {
        setGameStatus('submitted');
        alert('提交成功！等待其他玩家...');
      } else {
        alert('提交失败：' + result.message);
      }
    } catch (error) {
      alert('提交失败：' + error.message);
    }
  };

  // 移动牌
  const moveCard = (card, fromArea, toArea) => {
    if (fromArea === toArea) return;

    setArrangedCards(prev => {
      // 检查目标区域是否已满
      if ((toArea === 'head' && prev[toArea].length >= 3) ||
          (toArea !== 'head' && prev[toArea].length >= 5)) {
        alert('该区域已满！');
        return prev; // 返回未修改的状态
      }

      // 从原区域移除
      const newFrom = prev[fromArea].filter(c => 
        c && (typeof c === 'object' ? c.filename !== card.filename : c !== card)
      );
      
      // 添加到目标区域
      const newTo = [...prev[toArea], card];

      return {
        ...prev,
        [fromArea]: newFrom,
        [toArea]: newTo
      };
    });
  };

  // 重新开始游戏
  const handleRestart = () => {
    if (window.confirm('确定要重新开始游戏吗？')) {
      initGame();
    }
  };

  // 重置为初始理牌状态
  const handleReset = () => {
    if (currentGame && window.confirm('确定要重置为初始理牌状态吗？')) {
      setArrangedCards(currentGame.preset_arrangement);
    }
  };

  useEffect(() => {
    initGame();
  }, [roomType]);

  return (
    <div className="game-room">
      <div className="room-header">
        <h2>{roomType}分场 - 十三水游戏</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <span>玩家: {userInfo?.phone} | 余额: {userInfo?.balance}分</span>
          <span>状态: {
            gameStatus === 'waiting' ? '等待中' : 
            gameStatus === 'playing' ? '进行中' : '已提交'
          }</span>
        </div>
        <button className="link-btn" onClick={onExit} style={{ marginTop: '10px' }}>
          返回大厅
        </button>
      </div>

      <div className="card-areas">
        {/* 尾道 - 最大牌型 */}
        <CardArea
          title="尾道（5张）- 最大牌型"
          cards={arrangedCards.tail}
          area="tail"
          maxCards={5}
          onCardMove={moveCard}
          gameStatus={gameStatus}
        />
        
        {/* 中道 - 中等牌型 */}
        <CardArea
          title="中道（5张）- 中等牌型" 
          cards={arrangedCards.middle}
          area="middle"
          maxCards={5}
          onCardMove={moveCard}
          gameStatus={gameStatus}
        />
        
        {/* 头道 - 最小牌型 */}
        <CardArea
          title="头道（3张）- 最小牌型"
          cards={arrangedCards.head}
          area="head"
          maxCards={3}
          onCardMove={moveCard}
          gameStatus={gameStatus}
        />
      </div>

      <div className="game-controls">
        <button 
          className="btn control-btn" 
          onClick={handleReset}
          disabled={gameStatus !== 'playing'}
        >
          重置牌型
        </button>
        <button 
          className="btn control-btn" 
          onClick={handleSubmit}
          disabled={gameStatus !== 'playing'}
        >
          提交牌型
        </button>
        <button className="btn btn-secondary control-btn" onClick={handleRestart}>
          重新开始
        </button>
      </div>

      {gameStatus === 'submitted' && (
        <div style={{ 
          textAlign: 'center', 
          padding: '15px', 
          background: 'rgba(76, 175, 80, 0.2)',
          borderRadius: '8px',
          marginTop: '15px'
        }}>
          <p>✅ 已提交牌型，等待其他玩家完成...</p>
          <button 
            className="link-btn" 
            onClick={() => setGameStatus('playing')}
            style={{ marginTop: '10px' }}
          >
            重新调整牌型
          </button>
        </div>
      )}

      <div style={{ 
        textAlign: 'center', 
        marginTop: '20px', 
        padding: '15px', 
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        fontSize: '14px',
        opacity: 0.8
      }}>
        <p>💡 提示：拖拽扑克牌可以在三道之间调整，确保头道 ≤ 中道 ≤ 尾道</p>
      </div>
    </div>
  );
};

export default GameRoom;