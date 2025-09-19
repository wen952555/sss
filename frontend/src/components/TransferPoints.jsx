// --- START OF FILE frontend/src/components/TransferPoints.jsx (FIXED) ---

import React, { useState } from 'react';
import './TransferPoints.css';

const TransferPoints = ({ fromId, onClose, onSuccess }) => {
  const [phone, setPhone] = useState('');
  const [foundUserId, setFoundUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const handleFindUser = async () => {
    if (!phone) return setError('请输入手机号。');
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/index.php?action=find_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (data.success) {
        setFoundUserId(data.userId);
        setStep(2); // 进入下一步
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('查找失败，请检查网络。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async (amount) => {
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return setError('请输入有效的积分数量。');
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/index.php?action=transfer_points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromId, toId: foundUserId, amount: parsedAmount }),
      });
      const data = await response.json();
      if (data.success) {
        alert('赠送成功！');
        onSuccess(data.updatedUser); // 回调，刷新用户
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('操作失败，请检查网络。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
        {step === 2 && foundUserId && (
          <div className="step-content">
            <div className="confirmation-box">
              请确认接收方ID的最后两位是否为：
              {/* --- 核心修复：将 foundUserId 强制转换为字符串再 slice --- */}
              <span className="confirm-id">{String(foundUserId).slice(-2)}</span>
            </div>
            <p>第二步：选择赠送的积分数量</p>
            <div className="amount-selection">
              <button onClick={() => handleTransfer(100)} disabled={isLoading}>100</button>
              <button onClick={() => handleTransfer(200)} disabled={isLoading}>200</button>
              <button onClick={() => handleTransfer(300)} disabled={isLoading}>300</button>
              <button onClick={() => handleTransfer(500)} disabled={isLoading}>500</button>
            </div>
            <button onClick={() => setStep(1)} className="back-btn">返回上一步</button>
          </div>
        )}
        {error && <p className="modal-error">{error}</p>}
      </div>
    </div>
  );
};

export default TransferPoints;

// --- END OF FILE frontend/src/components/TransferPoints.jsx (FIXED) ---