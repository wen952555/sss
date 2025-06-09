import React, { useState } from 'react';

const Profile = ({ user, onLogout }) => {
  const [transferPhone, setTransferPhone] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [message, setMessage] = useState('');

  const handleTransfer = async () => {
    if (!transferPhone || !transferAmount || isNaN(transferAmount) {
      setMessage('请输入有效的手机号和积分数量');
      return;
    }
    
    const amount = parseInt(transferAmount);
    if (amount <= 0) {
      setMessage('积分数量必须大于0');
      return;
    }
    
    if (amount > user.points) {
      setMessage('积分不足');
      return;
    }
    
    try {
      const response = await fetch('https://9526.ip-ddns.com/api/user/transfer_points.php', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          toPhone: transferPhone,
          amount: amount
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage(`成功转账 ${amount} 积分给 ${transferPhone}`);
        // 更新本地积分
        user.points -= amount;
        setTransferPhone('');
        setTransferAmount('');
      } else {
        setMessage(data.message || '转账失败');
      }
    } catch (error) {
      setMessage('网络错误');
    }
  };

  return (
    <div className="profile">
      <h2>个人资料</h2>
      <p>手机号: {user.phone}</p>
      <p>积分: {user.points}</p>
      
      <div className="transfer-section">
        <h3>积分转账</h3>
        <div>
          <input
            type="text"
            placeholder="对方手机号"
            value={transferPhone}
            onChange={(e) => setTransferPhone(e.target.value)}
          />
          <input
            type="number"
            placeholder="积分数量"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            min="1"
          />
          <button onClick={handleTransfer}>转账</button>
        </div>
        {message && <p className="message">{message}</p>}
      </div>
      
      <button onClick={onLogout} className="logout-btn">退出登录</button>
    </div>
  );
};

export default Profile;
