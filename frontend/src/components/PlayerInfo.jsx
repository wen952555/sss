import React from 'react';

const PlayerInfo = ({ player, isCurrentPlayer = false }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 12px',
      background: isCurrentPlayer ? '#3498db' : '#34495e',
      borderRadius: '20px',
      color: 'white',
      fontSize: '0.9rem',
      margin: '5px 0'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: '#e74c3c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '0.8rem'
      }}>
        {player.name.charAt(0).toUpperCase()}
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold' }}>
          {player.name} {isCurrentPlayer && '(你)'}
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
          ID: {player.user_id_4d}
        </div>
      </div>
      
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 'bold' }}>
          {player.points} 分
        </div>
        <div style={{ 
          fontSize: '0.7rem', 
          color: player.ready ? '#27ae60' : '#e74c3c'
        }}>
          {player.ready ? '已准备' : '未准备'}
        </div>
      </div>
    </div>
  );
};

export default PlayerInfo;