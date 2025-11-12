import React, { useState, useEffect } from 'react';
import GameTableExtracted from './GameTableExtracted';
import CardComparisonExtracted from './CardComparisonExtracted';
import PaiDunArea from './PaiDunArea';

const AI_NAMES = ['小明', '小红', '小刚'];

export default function GameBoardIntegrated({ tableId, onExitGame }) {
  const [head, setHead] = useState([]);
  const [middle, setMiddle] = useState([]);
  const [tail, setTail] = useState([]);
  const [selected, setSelected] = useState({ area: '', cards: [] });
  const [isReady, setIsReady] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  
  // AI玩家状态
  const [aiPlayers, setAiPlayers] = useState([
    { name: AI_NAMES[0], isAI: true, processed: false, head: [], middle: [], tail: [] },
    { name: AI_NAMES[1], isAI: true, processed: false, head: [], middle: [], tail: [] },
    { name: AI_NAMES[2], isAI: true, processed: false, head: [], middle: [], tail: [] },
  ]);

  // 模拟发牌
  const dealCards = () => {
    // 模拟13张牌
    const mockCards = [
      's1', 's2', 's3', 'h4', 'h5', 'h6', 'c7', 'c8', 'c9', 'd10', 'd11', 'd12', 'd13'
    ];
    
    // 玩家牌
    setHead(mockCards.slice(0, 3));
    setMiddle(mockCards.slice(3, 8));
    setTail(mockCards.slice(8, 13));
    
    // AI玩家牌（模拟）
    setAiPlayers([
      { 
        name: AI_NAMES[0], 
        isAI: true, 
        processed: true, 
        head: ['s4', 's5', 's6'],
        middle: ['h7', 'h8', 'h9', 'h10', 'h11'],
        tail: ['c12', 'c13', 'd1', 'd2', 'd3']
      },
      { 
        name: AI_NAMES[1], 
        isAI: true, 
        processed: true, 
        head: ['s7', 's8', 's9'],
        middle: ['h12', 'h13', 'c1', 'c2', 'c3'],
        tail: ['d4', 'd5', 'd6', 'd7', 'd8']
      },
      { 
        name: AI_NAMES[2], 
        isAI: true, 
        processed: true, 
        head: ['s10', 's11', 's12'],
        middle: ['c4', 'c5', 'c6', 'c7', 'c8'],
        tail: ['d9', 'd10', 'd11', 'd12', 'd13']
      }
    ]);
  };

  const handleReady = () => {
    if (!isReady) {
      dealCards();
      setIsReady(true);
    } else {
      setHead([]);
      setMiddle([]);
      setTail([]);
      setIsReady(false);
      setSelected({ area: '', cards: [] });
    }
  };

  const handleCardClick = (card, area, e) => {
    e.stopPropagation();
    setSelected(prev => {
      if (prev.area !== area) return { area, cards: [card] };
      const isSelected = prev.cards.includes(card);
      let nextCards;
      if (isSelected) {
        nextCards = prev.cards.filter(c => c !== card);
      } else {
        nextCards = [...prev.cards, card];
      }
      return { area, cards: nextCards };
    });
  };

  const moveTo = (dest) => {
    if (!selected.cards.length) return;
    
    let newHead = [...head], newMiddle = [...middle], newTail = [...tail];
    const from = selected.area;
    
    if (from === 'head') newHead = newHead.filter(c => !selected.cards.includes(c));
    if (from === 'middle') newMiddle = newMiddle.filter(c => !selected.cards.includes(c));
    if (from === 'tail') newTail = newTail.filter(c => !selected.cards.includes(c));
    
    if (dest === 'head') newHead = [...newHead, ...selected.cards];
    if (dest === 'middle') newMiddle = [...newMiddle, ...selected.cards];
    if (dest === 'tail') newTail = [...newTail, ...selected.cards];
    
    setHead(newHead);
    setMiddle(newMiddle);
    setTail(newTail);
    setSelected({ area: dest, cards: [] });
  };

  const handleStartCompare = () => {
    setShowComparison(true);
  };

  // 准备比牌数据
  const getComparisonData = () => {
    return [
      { name: '你', head, middle, tail },
      ...aiPlayers.map(ai => ({ 
        name: ai.name, 
        head: ai.head, 
        middle: ai.middle, 
        tail: ai.tail 
      }))
    ];
  };

  return (
    <div>
      <GameTableExtracted
        players={aiPlayers}
        currentPlayerId={0}
        onExitRoom={onExitGame}
        userPoints={100}
      />
      
      {/* 牌墩区域 */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '420px',
        zIndex: 100
      }}>
        <PaiDunArea
          cards={head}
          label="头道"
          area="head"
          color="#23e67a"
          selected={selected}
          onCardClick={handleCardClick}
          onAreaClick={moveTo}
          isReady={isReady}
        />
        
        <PaiDunArea
          cards={middle}
          label="中道"
          area="middle"
          color="#23e67a"
          selected={selected}
          onCardClick={handleCardClick}
          onAreaClick={moveTo}
          isReady={isReady}
        />
        
        <PaiDunArea
          cards={tail}
          label="尾道"
          area="tail"
          color="#23e67a"
          selected={selected}
          onCardClick={handleCardClick}
          onAreaClick={moveTo}
          isReady={isReady}
        />

        {/* 操作按钮 */}
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          marginTop: 20,
          padding: '0 16px'
        }}>
          <button
            style={{
              flex: 1,
              background: !isReady
                ? 'linear-gradient(90deg,#23e67a 80%,#43ffb8 100%)'
                : '#b0b0b0',
              color: '#fff',
              fontWeight: 700,
              border: 'none',
              borderRadius: 10,
              padding: '13px 0',
              fontSize: 18,
              cursor: 'pointer',
              boxShadow: !isReady ? '0 2px 9px #23e67a22' : 'none'
            }}
            onClick={handleReady}
          >
            {isReady ? '取消准备' : '准备'}
          </button>
          
          <button
            style={{
              flex: 1,
              background: isReady ? '#ffb14d' : '#ddd',
              color: isReady ? '#222' : '#fff',
              fontWeight: 700,
              border: 'none',
              borderRadius: 10,
              padding: '13px 0',
              fontSize: 18,
              cursor: isReady ? 'pointer' : 'not-allowed'
            }}
            onClick={isReady ? handleStartCompare : undefined}
            disabled={!isReady}
          >
            开始比牌
          </button>
        </div>
      </div>

      {/* 比牌界面 */}
      <CardComparisonExtracted
        show={showComparison}
        onClose={() => setShowComparison(false)}
        players={getComparisonData()}
        foulStates={[false, false, false, false]} // 模拟倒水状态
        scores={[10, 8, 6, 4]} // 模拟得分
      />
    </div>
  );
}