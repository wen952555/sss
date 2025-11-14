import React, { useState, useEffect } from 'react';
import BalanceManager from '../components/BalanceManager';

const MainMenu = ({ userInfo, onSelectRoom, onNavigate, onLogout }) => {
  const [showBalanceManager, setShowBalanceManager] = useState(false);

  const rooms = [
    { type: '2', name: '2分场', description: '初级场，适合新手玩家', minBalance: 0 },
    { type: '5', name: '5分场', description: '中级场，挑战更高收益', minBalance: 100 },
    { type: '10', name: '10分场', description: '高级场，高手对决', minBalance: 500 }
  ];

  const handleRoomSelect = (roomType) => {
    const room = rooms.find(r => r.type === roomType);
    if (userInfo.balance < room.minBalance) {
      alert(`余额不足！进入${room.name}需要至少${room.minBalance}分`);
      return;
    }
    onSelectRoom(roomType);
    onNavigate('game');
  };

  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) {
      onLogout();
    }
  };

  const refreshUserInfo = () => {
    if (window.refreshUserInfo) {
      window.refreshUserInfo();
    }
  };

  return (
    <div className="main-menu">
      {/* 修改后的用户信息横幅 */}
      <div className="user-info-banner">
        <div className="banner-content">
          <button className="logout-btn" onClick={handleLogout}>
            退出登录
          </button>
          
          <div className="user-details">
            <span className="user-id">ID: {userInfo?.user_id}</span>
            <span className="user-balance">余额: {userInfo?.balance || 0}分</span>
          </div>
          
          <button
            className="balance-btn"
            onClick={() => setShowBalanceManager(true)}
          >
            积分管理
          </button>
        </div>
      </div>

      {/* 房间选择 */}
      <div className="room-selection">
        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>选择游戏场次</h2>

        {rooms.map(room => (
          <div
            key={room.type}
            className="room-card"
            onClick={() => handleRoomSelect(room.type)}
          >
            <h3>{room.name}</h3>
            <p>{room.description}</p>
            <div style={{ marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>
              最低余额：{room.minBalance}分
            </div>
          </div>
        ))}
      </div>

      {/* 游戏规则说明 */}
      <div style={{ textAlign: 'center', marginTop: '40px', opacity: 0.7 }}>
        <p>游戏规则：将13张牌分成头道(3张)、中道(5张)、尾道(5张)</p>
        <p>头道 ≤ 中道 ≤ 尾道，比较牌型大小决定胜负</p>
      </div>

      {/* 余额管理弹窗 */}
      {showBalanceManager && (
        <BalanceManager
          userInfo={userInfo}
          onClose={() => {
            setShowBalanceManager(false);
            refreshUserInfo();
          }}
        />
      )}
    </div>
  );
};

export default MainMenu;