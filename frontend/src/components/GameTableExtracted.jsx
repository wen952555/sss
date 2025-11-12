import React from 'react';

const CARD_HEIGHT = 88;
const CARD_WIDTH = Math.round(CARD_HEIGHT * 46 / 66);

export default function GameTableExtracted({ 
  players, 
  currentPlayerId,
  onExitRoom,
  userPoints = 100 
}) {
  const renderPlayerSeat = (player, isMe = false) => {
    const isReady = player.processed || isMe;
    
    return (
      <div
        className="play-seat"
        style={{
          border: 'none',
          borderRadius: 10,
          marginRight: 8,
          width: '22%',
          minWidth: 70,
          color: isMe ? '#23e67a' : (isReady ? '#23e67a' : '#fff'),
          background: isMe ? '#1c6e41' : '#2a556e',
          textAlign: 'center',
          padding: '12px 0',
          fontWeight: 700,
          fontSize: 17,
          boxShadow: "0 4px 22px #23e67a44, 0 1.5px 5px #1a462a6a",
          boxSizing: 'border-box',
          transition: 'color .28s'
        }}
      >
        <div>{player.name}</div>
        <div style={{ marginTop: 4, fontSize: 13, fontWeight: 400 }}>
          {isMe ? '你' : (isReady ? '已理牌' : '理牌中…')}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: '#164b2e',
      minHeight: '100vh',
      fontFamily: 'inherit'
    }}>
      <div style={{
        maxWidth: 420,
        width: '100%',
        margin: '30px auto',
        background: '#185a30',
        borderRadius: 22,
        boxShadow: "0 4px 22px #23e67a44, 0 1.5px 5px #1a462a6a",
        padding: 16,
        border: 'none',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 650,
        boxSizing: 'border-box'
      }}>
        {/* 头部：退出房间+积分 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <button
            style={{
              background: 'linear-gradient(90deg,#fff 60%,#e0fff1 100%)',
              color: '#234',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: 9,
              padding: '7px 22px',
              cursor: 'pointer',
              marginRight: 18,
              fontSize: 17,
              boxShadow: '0 1.5px 6px #23e67a30'
            }}
            onClick={onExitRoom}
          >
            &lt; 退出房间
          </button>
          <div style={{
            flex: 1,
            textAlign: 'right',
            color: '#23e67a',
            fontWeight: 900,
            fontSize: 21,
            letterSpacing: 2,
            marginRight: 8,
            textShadow: '0 2px 7px #23e67a44'
          }}>
            <span role="img" aria-label="coin" style={{ fontSize: 18, marginRight: 4 }}>🪙</span>
            积分：{userPoints}
          </div>
        </div>

        {/* 玩家区 */}
        <div style={{ display: 'flex', marginBottom: 18, gap: 8 }}>
          {/* 当前玩家 */}
          {renderPlayerSeat({ name: '你' }, true)}
          
          {/* 其他玩家 */}
          {players.map((player, idx) => 
            renderPlayerSeat(player, false)
          )}
        </div>

        {/* 牌桌中央区域 - 可以放置公共信息或动画 */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#23e67a',
          fontSize: 18,
          fontWeight: 600
        }}>
          游戏进行中...
        </div>
      </div>
    </div>
  );
}