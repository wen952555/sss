import React, { useState, useEffect } from 'react';
import Card from './Card';

const GameTable = ({ 
  players, 
  currentPlayerId,
  gameState,
  onPlayerAction 
}) => {
  const [selectedAction, setSelectedAction] = useState(null);

  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const otherPlayers = players.filter(p => p.id !== currentPlayerId);

  const getPlayerPosition = (index, total) => {
    const positions = [
      { top: '10%', left: '50%', transform: 'translateX(-50%)' }, // 顶部
      { top: '50%', right: '10%', transform: 'translateY(-50%)' }, // 右侧
      { bottom: '10%', left: '50%', transform: 'translateX(-50%)' }, // 底部
      { top: '50%', left: '10%', transform: 'translateY(-50%)' } // 左侧
    ];
    
    return positions[index % positions.length];
  };

  const getPlayerStatus = (player) => {
    if (player.folded) return '已弃牌';
    if (player.ready) return '已准备';
    if (player.id === currentPlayerId) return '你的回合';
    return '等待中';
  };

  const handleAction = (action) => {
    setSelectedAction(action);
    if (onPlayerAction) {
      onPlayerAction(action);
    }
  };

  return (
    <div className="table-area">
      {/* 牌桌中心 */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '120px',
        height: '120px',
        background: '#16a085',
        borderRadius: '50%',
        border: '3px solid #1abc9c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        textAlign: 'center'
      }}>
        {gameState?.phase === 'dealing' && '发牌中...'}
        {gameState?.phase === 'playing' && '游戏中'}
        {gameState?.phase === 'comparing' && '比牌中'}
        {gameState?.phase === 'finished' && '游戏结束'}
      </div>

      {/* 公共牌区（如果有的话） */}
      {gameState?.communityCards && gameState.communityCards.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '5px'
        }}>
          {gameState.communityCards.map((card, index) => (
            <Card key={index} cardCode={card} size="small" />
          ))}
        </div>
      )}

      {/* 其他玩家 */}
      {otherPlayers.map((player, index) => {
        const position = getPlayerPosition(index, players.length);
        
        return (
          <div
            key={player.id}
            style={{
              position: 'absolute',
              ...position,
              background: '#34495e',
              padding: '8px 12px',
              borderRadius: '20px',
              border: player.id === gameState?.currentTurn ? '2px solid #f39c12' : '2px solid #2c3e50',
              color: 'white',
              fontSize: '0.8rem',
              textAlign: 'center',
              minWidth: '80px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ fontWeight: 'bold' }}>{player.name}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
              {getPlayerStatus(player)}
            </div>
            <div style={{ fontSize: '0.7rem' }}>
              积分: {player.points}
            </div>
            {player.hand && player.hand.length > 0 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center',
                marginTop: '5px'
              }}>
                {Array.from({ length: player.hand.length }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '20px',
                      height: '28px',
                      background: '#e74c3c',
                      borderRadius: '2px',
                      margin: '0 1px',
                      border: '1px solid #c0392b'
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* 当前玩家操作区 */}
      {currentPlayer && (
        <div style={{
          position: 'absolute',
          bottom: '5%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(52, 73, 94, 0.9)',
          padding: '10px 15px',
          borderRadius: '15px',
          border: '2px solid #3498db',
          color: 'white',
          textAlign: 'center',
          minWidth: '200px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            {currentPlayer.name} (你)
          </div>
          <div style={{ fontSize: '0.8rem', marginBottom: '8px' }}>
            状态: {getPlayerStatus(currentPlayer)}
          </div>
          
          {/* 操作按钮 */}
          {gameState?.phase === 'playing' && currentPlayerId === gameState.currentTurn && (
            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
              <button 
                className="game-button"
                onClick={() => handleAction('check')}
                style={{ 
                  background: '#27ae60',
                  fontSize: '0.8rem',
                  padding: '6px 12px'
                }}
              >
                过牌
              </button>
              <button 
                className="game-button"
                onClick={() => handleAction('fold')}
                style={{ 
                  background: '#e74c3c',
                  fontSize: '0.8rem',
                  padding: '6px 12px'
                }}
              >
                弃牌
              </button>
            </div>
          )}
        </div>
      )}

      {/* 游戏信息 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(44, 62, 80, 0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '10px',
        fontSize: '0.8rem'
      }}>
        底注: {gameState?.ante || 0}
        <br />
        当前回合: {gameState?.currentTurn || '-'}
      </div>
    </div>
  );
};

export default GameTable;