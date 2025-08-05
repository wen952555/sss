import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './EightCardGame.css'; // <<<--- 引入新的CSS文件
import { evaluateHand, compareHands } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

const EightCardGame = ({ playerHand, otherPlayers, onBackToLobby }) => {
  // ... (内部逻辑不变)
  const [topLane, setTopLane] = useState(playerHand?.top || []);
  // ...

  // ... (所有 hooks 和函数不变)

  return (
    // <<<--- 修改根元素和内部结构以匹配新CSS
    <div className="eight-game-container">
      <div className="eight-game-panel">
        <div className="game-header">
          <button className="quit-button" onClick={onBackToLobby}>
            返回大厅
          </button>
          <h2>八张牌 - 三道分牌</h2>
        </div>

        {isLoading && <div className="loading-overlay">处理中...</div>}
        
        <div className="lanes-area">
          <Lane
            title="头道"
            cards={topLane}
            onCardClick={(c) => handleCardClick(c, 'top')}
            onLaneClick={() => handleLaneClick('top')}
            expectedCount={LANE_LIMITS.top}
            handType={topLaneHand?.name}
            selected={selectedCard}
          />
          <Lane
            title="中道"
            cards={middleLane}
            onCardClick={(c) => handleCardClick(c, 'middle')}
            onLaneClick={() => handleLaneClick('middle')}
            expectedCount={LANE_LIMITS.middle}
            handType={middleLaneHand?.name}
            selected={selectedCard}
          />
          <Lane
            title="尾道"
            cards={bottomLane}
            onCardClick={(c) => handleCardClick(c, 'bottom')}
            onLaneClick={() => handleLaneClick('bottom')}
            expectedCount={LANE_LIMITS.bottom}
            handType={bottomLaneHand?.name}
            selected={selectedCard}
          />
        </div>

        {isInvalid && <div className="error-message">无效牌型组合（倒水）</div>}
        
        <div className="game-actions-new">
          <button className="action-button-new auto-sort" onClick={handleAutoSort} disabled={isLoading}>
            智能理牌
          </button>
          <button
            className="action-button-new confirm"
            onClick={handleConfirm}
            disabled={
              isLoading ||
              isInvalid ||
              topLane.length !== LANE_LIMITS.top ||
              middleLane.length !== LANE_LIMITS.middle ||
              bottomLane.length !== LANE_LIMITS.bottom
            }
          >
            确认出牌
          </button>
        </div>
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default EightCardGame;