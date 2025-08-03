// frontend/src/components/UserProfile.jsx
import React from 'react';
import './UserProfile.css';

const UserProfile = ({ userId, user, onLogout, onTransferClick }) => {
  return (
    <div className="user-profile-bar">
      <div className="user-info">
        <span className="user-id">ID: {userId}</span>
        <span className="user-points">积分: {user.points}</span>
      </div>
      <div className="user-actions">
        <button onClick={onTransferClick} className="action-btn transfer">赠送积分</button>
        <button onClick={onLogout} className="action-btn logout">退出登录</button>
      </div>
    </div>
  );
};

export default UserProfile;
