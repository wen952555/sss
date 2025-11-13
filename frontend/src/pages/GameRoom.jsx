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
  const [selectedCards, setSelectedCards] = useState([]);
  const [lastSelectedArea, setLastSelectedArea] = useState(null);

  // 初始化游戏
  const initGame = async () => {
    try {
      const result = await gameAPI.getGame(roomType);
      if (result.success) {
        setCurrentGame(result);

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

  // 处理卡片点击选择
  const handleCardClick = (card, area) => {
    const cardKey = `${area}-${typeof card === 'object' ? card.filename : card}`;
    
    setSelectedCards(prev => {
      const isSelected = prev.some(selected => 
        selected.cardKey === cardKey
      );
      
      if (isSelected) {
        // 取消选择
        return prev.filter(selected => selected.cardKey !== cardKey);
      } else {
        // 添加选择
        return [...prev, { card, area, cardKey }];
      }
    });
    
    setLastSelectedArea(area);
  };

  // 处理区域点击移动
  const handleAreaClick = (targetArea) => {
    if (selectedCards.length === 0 || !lastSelectedArea) return;
    
    if (targetArea === lastSelectedArea) {
      // 同区域点击，只清除选择
      setSelectedCards([]);
      return;
    }

    // 移动选中的卡片
    const newArrangedCards = { ...arrangedCards };
    
    // 从原区域移除选中的卡片
    selectedCards.forEach(({ card, area }) => {
      newArrangedCards[area] = newArrangedCards[area].filter(c => 
        typeof c === 'object' ? c.filename !== card.filename : c !== card
      );
    });
    
    // 添加到目标区域
    selectedCards.forEach(({ card }) => {
      newArrangedCards[targetArea].push(card);
    });
    
    setArrangedCards(newArrangedCards);
    setSelectedCards([]);
    setLastSelectedArea(null);
  };

  // 提交牌型
  const handleSubmit = async () => {
    const totalArranged = arrangedCards.head.length + arrangedCards.middle.length + arrangedCards.tail.length;
    if (totalArranged !== 13) {
      alert('请确保13张牌全部分配到三道中！');
      return;
    }

    // 提交时检查数量
    if (arrangedCards.head.length !== 3) {
      alert('头道必须是3张牌！');
      return;
    }
    if (arrangedCards.middle.length !== 5) {
      alert('中道必须是5张牌！');
      return;
    }
    if (arrangedCards.tail.length !== 5) {
      alert('尾道必须是5张牌！');
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

  // 移动牌（拖拽功能 - 不再限制数量）
  const moveCard = (card, fromArea, toArea) => {
    if (fromArea === toArea) return;

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
      setSelectedCards([]);
      setLastSelectedArea(null);
    }
  };

  // 重置为初始理牌状态
  const handleReset = () => {
    if (currentGame && window.confirm('确定要重置为初始理牌状态吗？')) {
      setArrangedCards(currentGame.preset_arrangement);
      setSelectedCards([]);
      setLastSelectedArea(null);
    }
  };

  // 清除所有选择
  const clearSelection = () => {
    setSelectedCards([]);
    setLastSelectedArea(null);
  };

  useEffect(() => {
    initGame();
  }, [roomType]);

  return (
    <div className="game-room">
      {/* 紧凑的顶部横幅 */}
      <div className="game-header-banner">
        <div className="banner-content">
          <button className="exit-btn" onClick={onExit}>
            返回大厅
          </button>
          
          <div className="game-info">
            <span className="room-type">{roomType}分场</span>
            <span className="player-info">玩家: {userInfo?.phone}</span>
            <span className="balance-info">余额: {userInfo?.balance}分</span>
          </div>
          
          <div className="game-status">
            状态: {
              gameStatus === 'waiting' ? '等待中' :
              gameStatus === 'playing' ? '进行中' : '已提交'
            }
          </div>
        </div>
      </div>

      {/* 选择提示 */}
      {selectedCards.length > 0 && (
        <div className="selection-info">
          <span>已选择 {selectedCards.length} 张牌</span>
          <button className="clear-selection-btn" onClick={clearSelection}>
            取消选择
          </button>
        </div>
      )}

      <div className="card-areas">
        {/* 头道 - 最小牌型（最上面） */}
        <CardArea
          title={`头道（${arrangedCards.head.length}/3张）- 最小牌型`}
          cards={arrangedCards.head}
          area="head"
          onCardClick={handleCardClick}
          onAreaClick={handleAreaClick}
          onCardMove={moveCard}
          gameStatus={gameStatus}
          selectedCards={selectedCards}
        />

        {/* 中道 - 中等牌型 */}
        <CardArea
          title={`中道（${arrangedCards.middle.length}/5张）- 中等牌型`}
          cards={arrangedCards.middle}
          area="middle"
          onCardClick={handleCardClick}
          onAreaClick={handleAreaClick}
          onCardMove={moveCard}
          gameStatus={gameStatus}
          selectedCards={selectedCards}
        />

        {/* 尾道 - 最大牌型（最下面） */}
        <CardArea
          title={`尾道（${arrangedCards.tail.length}/5张）- 最大牌型`}
          cards={arrangedCards.tail}
          area="tail"
          onCardClick={handleCardClick}
          onAreaClick={handleAreaClick}
          onCardMove={moveCard}
          gameStatus={gameStatus}
          selectedCards={selectedCards}
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

      {/* 操作说明 */}
      <div className="game-instructions">
        <p>💡 操作说明：点击选择扑克牌（可多选），然后点击目标牌墩区域移动</p>
        <p>💡 也可以直接拖拽单张扑克牌移动</p>
      </div>
    </div>
  );
};

export default GameRoom;