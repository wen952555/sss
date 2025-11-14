import React, { useState, useEffect } from 'react';
import CardArea from '../components/CardArea';
import { validateCardArrangement } from '../utils/cardUtils';
import { gameAPI } from '../utils/api';

const GameRoom = ({ roomType, userInfo, onExit }) => {
  const [gameState, setGameState] = useState({
    arrangedCards: {
      head: [],
      middle: [],
      tail: []
    },
    originalCards: null,
    gameStatus: 'waiting',
    roomInfo: null,
    currentGame: null,
    selectedCards: [],
    lastSelectedArea: null
  });

  // 初始化游戏
  const initGame = async () => {
    try {
      const result = await gameAPI.getGame(roomType);
      if (result.success) {
        // 完全重置所有状态
        setGameState({
          arrangedCards: {
            head: [...result.preset_arrangement.head],
            middle: [...result.preset_arrangement.middle],
            tail: [...result.preset_arrangement.tail]
          },
          originalCards: {
            head: [...result.preset_arrangement.head],
            middle: [...result.preset_arrangement.middle],
            tail: [...result.preset_arrangement.tail]
          },
          gameStatus: 'playing',
          roomInfo: {
            id: result.game_id,
            type: roomType,
            players: 1,
            maxPlayers: 4
          },
          currentGame: result,
          selectedCards: [],
          lastSelectedArea: null
        });
      } else {
        alert('获取牌局失败：' + result.message);
      }
    } catch (error) {
      alert('获取牌局失败：' + error.message);
      console.error('初始化游戏错误:', error);
    }
  };

  // 更新游戏状态
  const updateGameState = (updates) => {
    setGameState(prev => ({ ...prev, ...updates }));
  };

  // 处理卡片点击选择
  const handleCardClick = (card, area) => {
    const cardKey = `${area}-${typeof card === 'object' ? card.filename : card}`;
    
    updateGameState({
      selectedCards: gameState.selectedCards.filter(selected => 
        selected.cardKey === cardKey
      ).length > 0 
        ? gameState.selectedCards.filter(selected => selected.cardKey !== cardKey)
        : [...gameState.selectedCards, { card, area, cardKey }],
      lastSelectedArea: area
    });
  };

  // 处理区域点击移动
  const handleAreaClick = (targetArea) => {
    if (gameState.selectedCards.length === 0 || !gameState.lastSelectedArea) return;
    
    if (targetArea === gameState.lastSelectedArea) {
      // 同区域点击，只清除选择
      updateGameState({
        selectedCards: [],
        lastSelectedArea: null
      });
      return;
    }

    // 移动选中的卡片
    const newArrangedCards = { ...gameState.arrangedCards };
    
    // 从原区域移除选中的卡片
    gameState.selectedCards.forEach(({ card, area }) => {
      newArrangedCards[area] = newArrangedCards[area].filter(c => 
        typeof c === 'object' ? c.filename !== card.filename : c !== card
      );
    });
    
    // 添加到目标区域
    gameState.selectedCards.forEach(({ card }) => {
      newArrangedCards[targetArea].push(card);
    });
    
    updateGameState({
      arrangedCards: newArrangedCards,
      selectedCards: [],
      lastSelectedArea: null
    });
  };

  // 提交牌型
  const handleSubmit = async () => {
    const totalArranged = gameState.arrangedCards.head.length + 
                         gameState.arrangedCards.middle.length + 
                         gameState.arrangedCards.tail.length;
    if (totalArranged !== 13) {
      alert('请确保13张牌全部分配到三道中！');
      return;
    }

    // 提交时检查数量
    if (gameState.arrangedCards.head.length !== 3) {
      alert('头道必须是3张牌！');
      return;
    }
    if (gameState.arrangedCards.middle.length !== 5) {
      alert('中道必须是5张牌！');
      return;
    }
    if (gameState.arrangedCards.tail.length !== 5) {
      alert('尾道必须是5张牌！');
      return;
    }

    if (!validateCardArrangement(
      gameState.arrangedCards.head, 
      gameState.arrangedCards.middle, 
      gameState.arrangedCards.tail
    )) {
      alert('牌型不符合规则！请确保：头道 ≤ 中道 ≤ 尾道');
      return;
    }

    try {
      const result = await gameAPI.submitCards(gameState.currentGame.game_id, gameState.arrangedCards);

      if (result.success) {
        updateGameState({ gameStatus: 'submitted' });
        alert('提交成功！等待其他玩家...');
      } else {
        alert('提交失败：' + result.message);
      }
    } catch (error) {
      alert('提交失败：' + error.message);
    }
  };

  // 移动牌（拖拽功能）
  const moveCard = (card, fromArea, toArea) => {
    if (fromArea === toArea) return;

    const newArrangedCards = { ...gameState.arrangedCards };
    newArrangedCards[fromArea] = newArrangedCards[fromArea].filter(c =>
      typeof c === 'object' ? c.filename !== card.filename : c !== card
    );

    newArrangedCards[toArea] = [...newArrangedCards[toArea], card];

    updateGameState({ arrangedCards: newArrangedCards });
  };

  // 重新开始游戏
  const handleRestart = () => {
    if (window.confirm('确定要重新开始游戏吗？')) {
      initGame();
    }
  };

  // 重置为初始理牌状态
  const handleReset = () => {
    if (gameState.originalCards && window.confirm('确定要重置为初始理牌状态吗？')) {
      // 完全重置为原始牌型
      updateGameState({
        arrangedCards: {
          head: [...gameState.originalCards.head],
          middle: [...gameState.originalCards.middle],
          tail: [...gameState.originalCards.tail]
        },
        selectedCards: [],
        lastSelectedArea: null
      });
    }
  };

  // 清除所有选择
  const clearSelection = () => {
    updateGameState({
      selectedCards: [],
      lastSelectedArea: null
    });
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
              gameState.gameStatus === 'waiting' ? '等待中' :
              gameState.gameStatus === 'playing' ? '进行中' : '已提交'
            }
          </div>
        </div>
      </div>

      {/* 选择提示 */}
      {gameState.selectedCards.length > 0 && (
        <div className="selection-info">
          <span>已选择 {gameState.selectedCards.length} 张牌</span>
          <button className="clear-selection-btn" onClick={clearSelection}>
            取消选择
          </button>
        </div>
      )}

      <div className="card-areas">
        {/* 头道 - 最小牌型（最上面） */}
        <CardArea
          title={`头道（${gameState.arrangedCards.head.length}/3张）- 最小牌型`}
          cards={gameState.arrangedCards.head}
          area="head"
          onCardClick={handleCardClick}
          onAreaClick={handleAreaClick}
          onCardMove={moveCard}
          gameStatus={gameState.gameStatus}
          selectedCards={gameState.selectedCards}
        />

        {/* 中道 - 中等牌型 */}
        <CardArea
          title={`中道（${gameState.arrangedCards.middle.length}/5张）- 中等牌型`}
          cards={gameState.arrangedCards.middle}
          area="middle"
          onCardClick={handleCardClick}
          onAreaClick={handleAreaClick}
          onCardMove={moveCard}
          gameStatus={gameState.gameStatus}
          selectedCards={gameState.selectedCards}
        />

        {/* 尾道 - 最大牌型（最下面） */}
        <CardArea
          title={`尾道（${gameState.arrangedCards.tail.length}/5张）- 最大牌型`}
          cards={gameState.arrangedCards.tail}
          area="tail"
          onCardClick={handleCardClick}
          onAreaClick={handleAreaClick}
          onCardMove={moveCard}
          gameStatus={gameState.gameStatus}
          selectedCards={gameState.selectedCards}
        />
      </div>

      <div className="game-controls">
        <button
          className="btn control-btn"
          onClick={handleReset}
          disabled={gameState.gameStatus !== 'playing'}
        >
          重置牌型
        </button>
        <button
          className="btn control-btn"
          onClick={handleSubmit}
          disabled={gameState.gameStatus !== 'playing'}
        >
          提交牌型
        </button>
        <button className="btn btn-secondary control-btn" onClick={handleRestart}>
          重新开始
        </button>
      </div>

      {gameState.gameStatus === 'submitted' && (
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
            onClick={() => updateGameState({ gameStatus: 'playing' })}
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
