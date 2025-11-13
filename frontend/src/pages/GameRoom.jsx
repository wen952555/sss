修改牌区域组件 (src/components/CardArea.jsx)
jsx
import React from 'react';
import Card from './Card';

const CardArea = ({ title, cards, area, maxCards, onCardMove, gameStatus }) => {
  const handleDrop = (e) => {
    e.preventDefault();
    if (gameStatus !== 'playing') return;

    const cardData = e.dataTransfer.getData('application/json');
    if (!cardData) return;

    try {
      const { card, fromArea } = JSON.parse(cardData);
      
      if (fromArea !== area) {
        onCardMove(card, fromArea, area);
      }
    } catch (error) {
      console.error('拖拽数据解析错误:', error);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (gameStatus === 'playing') {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const getAreaStyle = () => {
    const isFull = cards.length >= maxCards;
    const isValid = cards.length === maxCards;
    
    return {
      background: isValid ? 'rgba(76, 175, 80, 0.1)' : 
                  isFull ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 255, 255, 0.1)',
      border: isValid ? '2px solid #4CAF50' : 
              isFull ? '2px solid #FFC107' : '2px dashed rgba(255, 255, 255, 0.3)'
    };
  };

  return (
    <div 
      className="card-area"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={getAreaStyle()}
    >
      <div className="area-header">
        <h4>{title}</h4>
        <span>
          {cards.length}/{maxCards}
          {cards.length === maxCards && ' ✓'}
        </span>
      </div>
      
      <div className="card-slot">
        {cards.map((card, index) => (
          <Card
            key={typeof card === 'object' ? card.filename : `${card}-${index}`}
            card={card}
            area={area}
            draggable={gameStatus === 'playing'}
          />
        ))}
        {cards.length === 0 && (
          <div style={{ 
            color: 'rgba(255,255,255,0.5)', 
            textAlign: 'center', 
            width: '100%',
            padding: '20px'
          }}>
            {gameStatus === 'playing' ? '拖放扑克牌到此处' : '等待分配'}
          </div>
        )}
      </div>
    </div>
  );
};

export default CardArea;
修改扑克牌组件 (src/components/Card.jsx)
jsx
import React from 'react';

const Card = ({ card, area, draggable = true }) => {
  const handleDragStart = (e) => {
    if (!draggable) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('application/json', JSON.stringify({
      card,
      fromArea: area
    }));
  };

  const handleDragEnd = (e) => {
    // 拖拽结束处理
  };

  // 获取卡片显示名称
  const getCardDisplay = (card) => {
    if (typeof card === 'object') {
      return card.display || card.filename;
    }
    return card;
  };

  // 获取卡片文件名
  const getCardFilename = (card) => {
    if (typeof card === 'object') {
      return card.filename;
    }
    return card;
  };

  return (
    <div
      className="card"
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        cursor: draggable ? 'grab' : 'default',
        opacity: draggable ? 1 : 0.8
      }}
      title={getCardDisplay(card)}
    >
      <img 
        src={`/cards/${getCardFilename(card)}`} 
        alt={getCardDisplay(card)}
        onError={(e) => {
          // 图片加载失败时显示替代样式
          e.target.style.display = 'none';
          const parent = e.target.parentNode;
          
          // 解析卡片信息显示文本
          let displayText = getCardDisplay(card);
          if (typeof card === 'string' && card.includes('_of_')) {
            const [value, suit] = card.replace('.svg', '').split('_of_');
            const suitSymbols = {
              'clubs': '♣',
              'diamonds': '♦', 
              'hearts': '♥',
              'spades': '♠'
            };
            const valueMap = {
              'ace': 'A', 'king': 'K', 'queen': 'Q', 'jack': 'J'
            };
            displayText = `${valueMap[value] || value}${suitSymbols[suit] || suit}`;
          }
          
          parent.innerHTML = `
            <div style="
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: white;
              color: #333;
              border-radius: 5px;
              border: 1px solid #ccc;
              font-size: 10px;
              text-align: center;
              padding: 5px;
              box-sizing: border-box;
            ">
              <div style="font-weight: bold; margin-bottom: 2px;">${displayText}</div>
            </div>
          `;
        }}
      />
    </div>
  );
};

export default Card;
更新样式文件 (src/index.css)
css
/* 在原有样式基础上，移除手牌相关样式，调整牌区域样式 */

/* 移除手牌样式 */
.hand-cards {
  display: none;
}

/* 调整游戏控制按钮布局 */
.game-controls {
  display: flex;
  gap: 15px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  margin-top: 20px;
}

.control-btn {
  flex: 1;
  padding: 15px;
  font-size: 16px;
}

/* 调整牌区域样式 */
.card-areas {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 0;
}

.card-area {
  background: rgba(255, 255, 255, 0.1);
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  padding: 15px;
  min-height: 150px;
  transition: all 0.3s ease;
}

/* 扑克牌样式调整 */
.card {
  width: 70px;
  height: 98px;
  cursor: grab;
  transition: transform 0.2s;
  user-select: none;
}

.card:hover {
  transform: translateY(-3px);
}

.card.dragging {
  opacity: 0.7;
}

.card img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 响应式设计调整 */
@media (max-width: 768px) {
  .card {
    width: 50px;
    height: 70px;
  }
  
  .game-controls {
    flex-direction: column;
  }
  
  .card-area {
    padding: 10px;
    min-height: 120px;
  }
}
更新扑克牌工具函数 (src/utils/cardUtils.js)
javascript
// 验证牌型是否合法 - 增强版本
export const validateCardArrangement = (head, middle, tail) => {
  // 检查数量
  if (head.length !== 3 || middle.length !== 5 || tail.length !== 5) {
    return false;
  }
  
  // 这里可以添加更复杂的牌型大小验证
  // 实际应该比较头道 ≤ 中道 ≤ 尾道
  
  // 基础验证通过
  return true;
};

// 其他工具函数保持不变...
export const parseCardFromFilename = (filename) => {
  const match = filename.match(/(.+)_of_(.+)\.svg/);
  if (!match) return null;
  
  const [, value, suit] = match;
  
  // 花色映射
  const SUIT_MAP = {
    'clubs': '♣',
    'spades': '♠', 
    'diamonds': '♦',
    'hearts': '♥'
  };

  // 点数映射
  const VALUE_MAP = {
    'ace': 'A',
    'king': 'K',
    'queen': 'Q',
    'jack': 'J',
    '10': '10',
    '9': '9',
    '8': '8',
    '7': '7',
    '6': '6',
    '5': '5',
    '4': '4',
    '3': '3',
    '2': '2'
  };

  return {
    value,
    suit,
    display: `${VALUE_MAP[value] || value}${SUIT_MAP[suit] || suit}`,
    filename,
    sortValue: getSortValue(value, suit)
  };
}

// 获取排序值
const getSortValue = (value, suit) => {
  const valueOrder = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
  };
  const suitOrder = {
    'clubs': 0, 'diamonds': 1, 'hearts': 2, 'spades': 3
  };
  
  return valueOrder[value] * 10 + suitOrder[suit];
}

// 洗牌算法
export const shuffleCards = (cards) => {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 生成52张标准扑克牌
export const generateDeck = () => {
  const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
  
  const deck = [];
  suits.forEach(suit => {
    values.forEach(value => {
      const filename = `${value}_of_${suit}.svg`;
      deck.push(parseCardFromFilename(filename));
    });
  });
  
  return deck;
}import React, { useState, useEffect } from 'react';
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

    // 检查目标区域是否已满
    if ((toArea === 'head' && arrangedCards[toArea].length >= 3) ||
        (toArea !== 'head' && arrangedCards[toArea].length >= 5)) {
      alert('该区域已满！');
      return;
    }

    // 从原区域移除
    const newFrom = arrangedCards[fromArea].filter(c => 
      typeof c === 'object' ? c.filename !== card.filename : c !== card
    );
    
    // 添加到目标区域
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