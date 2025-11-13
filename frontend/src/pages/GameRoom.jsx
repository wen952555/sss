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
  const [gameStatus, setGameStatus] = useState('waiting');
  const [roomInfo, setRoomInfo] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  // 初始化游戏
  const initGame = async () => {
    try {
      const result = await gameAPI.getGame(roomType);
      if (result.success) {
        setCurrentGame(result);
        
        // 记录调试信息
        setDebugInfo(`获取到牌局: ${result.game_id}, 头道: ${result.preset_arrangement.head.length}张, 中道: ${result.preset_arrangement.middle.length}张, 尾道: ${result.preset_arrangement.tail.length}张`);
        console.log('API返回数据:', result);
        
        // 直接使用后端预设的理牌结果
        setArrangedCards(result.preset_arrangement);
        setGameStatus('playing');
        
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
      console.error('初始化游戏错误:', error);
    }
  };

  // 提交牌型
  const handleSubmit = async () => {
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

    if ((toArea === 'head' && arrangedCards[toArea].length >= 3) ||
        (toArea !== 'head' && arrangedCards[toArea].length >= 5)) {
      alert('该区域已满！');
      return;
    }

    const newFrom = arrangedCards[fromArea].filter(c => 
      typeof c === 'object' ? c.filename !== card.filename : c !== card
    );
    
    const newTo = [...arrangedCards[toArea], card];

    setArrangedCards(prev => ({
      ...prev,
      [fromArea]: newFrom,
      [toArea]: newTo
    }));
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

  // 检查卡片数据
  const checkCardData = () => {
    console.log('当前卡片数据:', arrangedCards);
    const headCards = arrangedCards.head.map(card => 
      typeof card === 'object' ? card.filename : card
    );
    const middleCards = arrangedCards.middle.map(card => 
      typeof card === 'object' ? card.filename : card
    );
    const tailCards = arrangedCards.tail.map(card => 
      typeof card === 'object' ? card.filename : card
    );
    
    alert(`头道: ${headCards.join(', ')}\n中道: ${middleCards.join(', ')}\n尾道: ${tailCards.join(', ')}`);
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
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button className="link-btn" onClick={onExit}>
            返回大厅
          </button>
          <button className="link-btn" onClick={checkCardData}>
            调试卡片
          </button>
        </div>
      </div>

      {debugInfo && (
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '10px', 
          borderRadius: '5px',
          marginBottom: '10px',
          fontSize: '12px'
        }}>
          调试信息: {debugInfo}
        </div>
      )}

      <div className="card-areas">
        {/* 头道 - 最小牌型（最上面） */}
        <CardArea
          title="头道（3张）- 最小牌型"
          cards={arrangedCards.head}
          area="head"
          maxCards={3}
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
        
        {/* 尾道 - 最大牌型（最下面） */}
        <CardArea
          title="尾道（5张）- 最大牌型"
          cards={arrangedCards.tail}
          area="tail"
          maxCards={5}
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