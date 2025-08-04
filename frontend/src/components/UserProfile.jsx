// frontend/src/components/UserProfile.jsx
import React from 'react';
import './UserProfile.css';

const UserProfile = ({ userId, user, onLogout, onTransferClick }) => {
  return (
    <div className="user-profile-container">
      <div className="user-profile-panel">
        <h2>我的资料</h2>
        <div className="profile-item">
          <span className="profile-item-label">ID</span>
          <span className="profile-item-value">{userId}</span>
        </div>
        <div className="profile-item">
          <span className="profile-item-label">手机号</span>
          <span className="profile-item-value">{user.phone}</span>
        </div>
        <div className="profile-item">
          <span className="profile-item-label">积分</span>
          <span className="profile-item-value">{user.points}</span>
        </div>
        <div className="profile-item">
          <span className="profile-item-label">注册时间</span>
          <span className="profile-item-value">{user.created_at}</span>
        </div>
        <div style={{ marginTop: 30, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={onTransferClick} className="action-btn transfer">赠送积分</button>
          <button onClick={onLogout} className="action-btn logout" style={{ background: '#e74c3c', color: '#fff' }}>退出登录</button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
