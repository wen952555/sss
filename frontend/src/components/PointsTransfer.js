import React, { useState } from 'react';
import api from '../services/api';
import './PointsTransfer.css';

const PointsTransfer = ({ currentPoints }) => {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/points/transfer', { phone, amount });
      setMessage(`成功转账 ${amount} 积分`);
      setPhone('');
      setAmount('');
    } catch (error) {
      setMessage(error.response?.data?.error || '转账失败');
    }
  };

  return (
    <div className="points-transfer">
      <h3>积分转账</h3>
      <form onSubmit={handleTransfer}>
        <input
          type="text"
          placeholder="接收方手机号"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="转账金额"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="1"
          max={currentPoints}
          required
        />
        <button type="submit">确认转账</button>
      </form>
      {message && <div className="message">{message}</div>}
    </div>
  );
};

export default PointsTransfer;
