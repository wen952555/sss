// frontend/src/components/TransferPoints.jsx
import React, { useState } from 'react';
import './TransferPoints.css'; // 确保引入

const TransferPoints = ({ fromId, onClose, onSuccess }) => {
    // ... 逻辑不变
    const [phone, setPhone] = useState('');
    // ...

  return (
    // 使用新的 modal backdrop 和 content 类名
    <div className="modal-backdrop">
      <div className="modal-content transfer-modal-content">
        <button onClick={onClose} className="close-modal-btn">×</button>
        <h3>赠送积分</h3>
        {step === 1 && (
          <div className="step-content">
            <p>第一步：输入好友的手机号</p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="好友的11位手机号"
            />
            <button onClick={handleFindUser} disabled={isLoading}>
              {isLoading ? '正在查找...' : '查找好友'}
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="step-content">
            <div className="confirmation-box">
              请确认接收方ID的最后两位是否为：
              <span className="confirm-id">{foundUserId.slice(-2)}</span>
            </div>
            <p>第二步：输入赠送的积分数量</p>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="要赠送的积分"
            />
            <button onClick={handleTransfer} disabled={isLoading}>
              {isLoading ? '正在处理...' : '确认赠送'}
            </button>
            <button onClick={() => setStep(1)} className="back-btn">返回上一步</button>
          </div>
        )}
        {error && <p className="modal-error">{error}</p>}
      </div>
    </div>
  );
};

export default TransferPoints;