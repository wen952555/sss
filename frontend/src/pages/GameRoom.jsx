import React, { useState, useEffect } from 'react';
import CardArea from '../components/CardArea';
import { generateDeck, shuffleCards, autoArrangeCards, validateCardArrangement } from '../utils/cardUtils';
import { gameAPI } from '../utils/api';

const GameRoom = ({ roomType, userInfo, onExit }) => {
  const [deck, setDeck] = useState([]);
  const [hand, setHand] = useState([]);
  const [arrangedCards, setArrangedCards] = useState({
    head: [],
    middle: [],
    tail: []
  });
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, submitted
  const [roomInfo, setRoomInfo] = useState(null);

  // 初始化游戏
  const initGame = () => {
    const newDeck = generateDeck();
    const shuffled = shuffleCards(newDeck);
    const playerHand = shuffled.slice(0, 13);
    
    setDeck(shuffled);
    setHand(playerHand);
    setArrangedCards({ head: [], middle: [], tail: [] });
    setGameStatus('playing');
    
    // 模拟创建房间
    setRoomInfo({
      id: 'room_' + Date.now(),
      type: roomType,
      players: 1,
      maxPlayers: 4
    });
  };

  // 智能理牌
  const handleAutoArrange = () => {
    const autoArranged = autoArrangeCards(hand);
    setArrangedCards(autoArranged);
    setHand([]); // 所有牌都分配到三道
  };

  // 提交牌型
  const handleSubmit = async () => {
    // 检查是否所有牌都已分配
    const totalArranged = arrangedCards.head.length + arrangedCards.middle.length + arrangedCards.tail.length;
    if (totalArranged !== 13) {
      alert('请将13张牌全部分配到三道中！');
      return;
    }

    if (!validateCardArrangement(arrangedCards.head, arrangedCards.middle, arrangedCards.tail)) {
      alert('牌型不符合规则！请确保：头道 ≤ 中道 ≤ 尾道');
      return;
    }

    try {
      // 模拟提交成功
      console.log('提交牌型:', arrangedCards);
      // 实际调用：await gameAPI.submitCards(roomInfo.id, arrangedCards);
      
      setGameStatus('submitted');
      alert('提交成功！等待其他玩家...');
    } catch (error) {
      alert('提交失败：' + error.message);
    }
  };

  // 移动牌
  const moveCard = (card, fromArea, toArea) => {
    if (fromArea === toArea) return;

    // 从原区域移除
    const newFrom = arrangedCards[fromArea].filter(c => c.filename !== card.filename);
    // 添加到目标区域
    const newTo = [...arrangedCards[toArea], card];

    setArrangedCards(prev => ({
      ...prev,
      [fromArea]: newFrom,
      [toArea]: newTo
    }));
  };

  // 从手牌放到区域
  const placeCardFromHand = (card, toArea) => {
    // 检查目标区域是否已满
    if ((toArea === 'head' && arrangedCards.head.length >= 3) ||
        (toArea !== 'head' && arrangedCards[toArea].length >= 5)) {
      alert('该区域已满！');
      return;
    }

    // 从手牌移除
    const newHand = hand.filter(c => c.filename !== card.filename);
    // 添加到目标区域
    const newArea = [...arrangedCards[toArea], card];

    setHand(newHand);
    setArrangedCards(prev => ({
      ...prev,
      [toArea]: newArea
    }));
  };

  // 从区域放回手牌
  const returnCardToHand = (card, fromArea) => {
    const newArea = arrangedCards[fromArea].filter(c => c.filename !== card.filename);
    const newHand = [...hand, card];

    setHand(newHand);
    setArrangedCards(prev => ({
      ...prev,
      [fromArea]: newArea
    }));
  };

  // 重新开始游戏
  const handleRestart = () => {
    if (window.confirm('确定要重新开始游戏吗？')) {
      initGame();
    }
  };

  useEffect(() => {
    initGame();
  }, []);

  return (
    <div className="game-room">
      <div className="room-header">
        <h2>{roomType}分场 - 十三水游戏</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <span>玩家: {userInfo?.username} | 余额: {userInfo?.balance}分</span>
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
        <CardArea
          title="尾道（5张）- 最大牌型"
          cards={arrangedCards.tail}
          area="tail"
          maxCards={5}
          onCardMove={moveCard}
          onCardReturn={returnCardToHand}
          gameStatus={gameStatus}
        />
        
        <CardArea
          title="中道（5张）- 中等牌型" 
          cards={arrangedCards.middle}
          area="middle"
          maxCards={5}
          onCardMove={moveCard}
          onCardReturn={returnCardToHand}
          gameStatus={gameStatus}
        />
        
        <CardArea
          title="头道（3张）- 最小牌型"
          cards={arrangedCards.head}
          area="head"
          maxCards={3}
          onCardMove={moveCard}
          onCardReturn={returnCardToHand}
          gameStatus={gameStatus}
        />
      </div>

      <div className="hand-cards">
        <h4>手牌 ({hand.length}张) - 点击手牌自动分配到合适区域</h4>
        <div className="card-slot">
          {hand.map(card => (
            <div
              key={card.filename}
              className="card"
              onClick={() => {
                // 自动选择区域：如果头道未满3张则放头道，否则中道，最后尾道
                if (arrangedCards.head.length < 3) {
                  placeCardFromHand(card, 'head');
                } else if (arrangedCards.middle.length < 5) {
                  placeCardFromHand(card, 'middle');
                } else if (arrangedCards.tail.length < 5) {
                  placeCardFromHand(card, 'tail');
                } else {
                  alert('所有区域已满！');
                }
              }}
              title={card.display}
            >
              <img 
                src={`/cards/${card.filename}`} 
                alt={card.display}
                onError={(e) => {
                  // 图片加载失败时显示替代文本
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f0f0f0;color:#333;border-radius:5px;font-size:12px;">${card.display}</div>`;
                }}
              />
            </div>
          ))}
          {hand.length === 0 && gameStatus === 'playing' && (
            <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', width: '100%' }}>
              所有牌已分配，点击"智能理牌"重新分配或拖拽调整
            </div>
          )}
        </div>
      </div>

      <div className="game-controls">
        <button 
          className="btn control-btn" 
          onClick={handleAutoArrange}
          disabled={gameStatus !== 'playing'}
        >
          智能理牌
        </button>
        <button 
          className="btn control-btn" 
          onClick={handleSubmit}
          disabled={gameStatus !== 'playing' || hand.length > 0}
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
    </div>
  );
};

export default GameRoom;