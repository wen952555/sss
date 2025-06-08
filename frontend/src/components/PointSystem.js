import React, { useState } from 'react';

const PointSystem = ({ user, onSendPoints }) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState(10);
  const [message, setMessage] = useState('');
  
  const handleSend = () => {
    if (!recipient.trim()) {
      setMessage('请输入接收方手机号');
      return;
    }
    
    if (amount <= 0) {
      setMessage('积分必须大于0');
      return;
    }
    
    if (amount > user.points) {
      setMessage('积分不足');
      return;
    }
    
    // 在实际应用中，这里会调用API
    onSendPoints(recipient, amount);
    
    setMessage(`成功赠送 ${amount} 积分给 ${recipient}`);
    setRecipient('');
  };
  
  return (
    <div className="point-system">
      <h3>积分管理</h3>
      <div className="transfer-form">
        <input
          type="text"
          placeholder="接收方手机号"
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
        />
        <input
          type="number"
          min="1"
          max={user ? user.points : 0}
          value={amount}
          onChange={e => setAmount(parseInt(e.target.value) || 0)}
        />
        <button onClick={handleSend}>赠送积分</button>
      </div>
      {message && <div className="message">{message}</div>}
      
      <div className="transaction-history">
        <h4>最近交易</h4>
        <ul>
          <li>2023-10-01 赠送 100 积分给 138****1234</li>
          <li>2023-09-28 收到 150 积分来自 139****5678</li>
          <li>2023-09-25 游戏赢得 200 积分</li>
        </ul>
      </div>
    </div>
  );
};

export default PointSystem;
