// frontend_react/src/components/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import './ProfilePage.css';

const ProfilePage = ({ currentUser, onLogout, onUpdatePoints, onBackToGame }) => {
  const [toPhone, setToPhone] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [transferMessage, setTransferMessage] = useState({ type: '', text: '' }); // type: 'success' or 'error'
  const [isLoadingTransfer, setIsLoadingTransfer] = useState(false);

  // If currentUser data changes (e.g. after points transfer), this component will re-render.

  const handleTransferPoints = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!toPhone || !toId || !amount) {
      setTransferMessage({ type: 'error', text: '请填写所有字段' });
      return;
    }
    const transferAmount = parseInt(amount, 10);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      setTransferMessage({ type: 'error', text: '请输入有效的赠送数量' });
      return;
    }

    setIsLoadingTransfer(true);
    setTransferMessage({ type: '', text: '' });

    try {
      const result = await authService.transferPoints({
        fromUserId: currentUser.id,
        toPhone,
        toId,
        amount: transferAmount,
        token: currentUser.token // Assuming token is stored in currentUser
      });
      if (result.success) {
        setTransferMessage({ type: 'success', text: `成功赠送 ${transferAmount} 积分!` });
        onUpdatePoints(result.newFromUserPoints); // Callback to update points in App.js state
        setToPhone('');
        setToId('');
        setAmount('');
      }
    } catch (err) {
      setTransferMessage({ type: 'error', text: err.message || '赠送失败，请稍后再试' });
    }
    setIsLoadingTransfer(false);
  };

  if (!currentUser) {
    return <div className="profile-page-loading">加载用户信息中...</div>;
  }

  return (
    <div className="profile-page-container">
      <div className="profile-header">
        <h2>个人资料</h2>
        <button onClick={onBackToGame} className="back-to-game-btn">← 返回游戏</button>
      </div>

      <div className="profile-info-card">
        <p><strong>手机号:</strong> {currentUser.phone}</p>
        <p><strong>玩ID:</strong> {currentUser.id}</p>
        <p><strong>当前积分:</strong> <span className="profile-points">{currentUser.points}</span></p>
        <button onClick={onLogout} className="logout-btn">退出登录</button>
      </div>

      <div className="transfer-points-card">
        <h3>赠送积分</h3>
        {transferMessage.text && (
          <p className={`transfer-message ${transferMessage.type}`}>
            {transferMessage.text}
          </p>
        )}
        <form onSubmit={handleTransferPoints}>
          <div className="form-group-profile">
            <label htmlFor="toPhone">接收方手机号:</label>
            <input
              type="tel"
              id="toPhone"
              value={toPhone}
              onChange={(e) => setToPhone(e.target.value)}
              placeholder="11位手机号"
              required
            />
          </div>
          <div className="form-group-profile">
            <label htmlFor="toId">接收方ID:</label>
            <input
              type="text" // ID might not be purely numeric if generated differently later
              id="toId"
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              placeholder="4位数字ID"
              required
            />
          </div>
          <div className="form-group-profile">
            <label htmlFor="amount">赠送数量:</label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="积分数量"
              required
              min="1"
            />
          </div>
          <button type="submit" className="transfer-submit-btn" disabled={isLoadingTransfer}>
            {isLoadingTransfer ? '处理中...' : '确认赠送'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
