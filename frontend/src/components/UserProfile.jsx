// frontend/src/components/UserProfile.jsx
import React from 'react';
import './UserProfile.css';

const UserProfile = ({ userId, user, onLogout, onTransferClick, onBack }) => {
  return (
    <div className="user-profile-container">
      <div className="user-profile-panel">
        <button className="back-button" onClick={onBack}>&larr; 返回</button>
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
        {/* 使用新的按钮容器和样式类 */}
        <div className="user-profile-btns">
          <button onClick={onTransferClick} className="transfer">赠送积分</button>
          <button onClick={onLogout} className="logout">退出登录</button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;