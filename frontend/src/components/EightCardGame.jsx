// ... imports
import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './EightCardGame.css';
import { evaluateHand, compareHands } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

const EightCardGame = ({ playerHand, otherPlayers, onBackToLobby }) => {
  // ... all hooks and logic remain the same
  const [topLane, setTopLane] = useState(playerHand?.top || []);
  // ... etc.

  // 判断是否为多人试玩模式
  const isMultiplayerTrial = Object.keys(otherPlayers).length > 1;

  return (
    <div className="eight-game-container">
      <div className="eight-game-panel">
        <div className="game-header">
          <button className="quit-button" onClick={onBackToLobby}>退出</button>
          <h2>八张牌</h2>
        </div>
        
        {/* 条件渲染玩家布局 */}
        {isMultiplayerTrial && (
          <div className="players-grid">
            <div className="player-box you">
              <div className="player-name">你</div>
              <div className="player-status">理牌中...</div>
            </div>
            {Object.keys(otherPlayers).slice(0, 3).map((playerName, index) => (
              <div key={index} className="player-box ready">
                <div className="player-name">{playerName}</div>
                <div className="player-status">已理牌</div>
              </div>
            ))}
          </div>
        )}

        {isLoading && <div className="loading-overlay">处理中...</div>}
        
        <div className="lanes-area">
          {/* Lane components remain the same */}
           <Lane
            title="头道" cards={topLane} onCardClick={(c) => handleCardClick(c, 'top')}
            onLaneClick={() => handleLaneClick('top')} expectedCount={LANE_LIMITS.top}
            handType={topLaneHand?.name} selected={selectedCard}
          />
          <Lane
            title="中道" cards={middleLane} onCardClick={(c) => handleCardClick(c, 'middle')}
            onLaneClick={() => handleLaneClick('middle')} expectedCount={LANE_LIMITS.middle}
            handType={middleLaneHand?.name} selected={selectedCard}
          />
          <Lane
            title="尾道" cards={bottomLane} onCardClick={(c) => handleCardClick(c, 'bottom')}
            onLaneClick={() => handleLaneClick('bottom')} expectedCount={LANE_LIMITS.bottom}
            handType={bottomLaneHand?.name} selected={selectedCard}
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
              isLoading || isInvalid || topLane.length !== 2 || middleLane.length !== 3 || bottomLane.length !== 3
            }>
            确认出牌
          </button>
        </div>
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default EightCardGame;