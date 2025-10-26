import React from 'react';

const PlayerBanner = ({ onBackToLobby, title, isOnline, user }) => {
  return (
    <div className="game-table-header">
      <button onClick={onBackToLobby} className="table-action-btn back-btn">&larr; 退出</button>
      <div className="game-table-title">
        {title}
        <span className={`connection-status-indicator ${isOnline ? 'online' : 'offline'}`}></span>
      </div>
      {user && <div className="user-points">积分: {user.points}</div>}
    </div>
  );
};

export default PlayerBanner;
