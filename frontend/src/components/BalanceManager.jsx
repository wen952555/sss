import React, { useState, useEffect } from 'react';
import { balanceAPI } from '../utils/api';

const BalanceManager = ({ userInfo, onClose }) => {
  const [activeTab, setActiveTab] = useState('transfer');
  const [transferData, setTransferData] = useState({
    toUserId: '',
    amount: '',
    note: ''
  });
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadRecentTransfers();
  }, []);

  const loadRecentTransfers = async () => {
    try {
      const result = await balanceAPI.getRecentTransfers(10);
      setTransfers(result.transfers || []);
    } catch (error) {
      console.error('加载转账记录失败:', error);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!transferData.toUserId || !transferData.amount) {
      setMessage('请填写完整信息');
      setLoading(false);
      return;
    }

    const amount = parseInt(transferData.amount);
    if (amount <= 0) {
      setMessage('转账金额必须大于0');
      setLoading(false);
      return;
    }

    if (amount > userInfo.balance) {
      setMessage('余额不足');
      setLoading(false);
      return;
    }

    try {
      const result = await balanceAPI.transfer(
        transferData.toUserId, 
        amount, 
        transferData.note
      );
      
      setMessage(`转账成功！当前余额: ${result.new_balance}分`);
      setTransferData({ toUserId: '', amount: '', note: '' });
      loadRecentTransfers();
      
      // 更新用户信息
      if (window.refreshUserInfo) {
        window.refreshUserInfo();
      }
    } catch (error) {
      setMessage(error.message || '转账失败');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setTransferData({
      ...transferData,
      [e.target.name]: e.target.value
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>积分管理</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="balance-info" style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '16px', margin: 0 }}>
            当前余额: <span style={{ color: '#FFD700', fontSize: '20px', fontWeight: 'bold' }}>
              {userInfo?.balance || 0}
            </span> 分
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
            用户ID: {userInfo?.user_id}
          </p>
        </div>

        <div className="tabs" style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
          <button 
            className={`tab-btn ${activeTab === 'transfer' ? 'active' : ''}`}
            onClick={() => setActiveTab('transfer')}
            style={{
              flex: 1,
              padding: '10px',
              background: 'none',
              border: 'none',
              color: 'white',
              borderBottom: activeTab === 'transfer' ? '2px solid #4CAF50' : 'none',
              cursor: 'pointer'
            }}
          >
            转账
          </button>
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '10px',
              background: 'none',
              border: 'none',
              color: 'white',
              borderBottom: activeTab === 'history' ? '2px solid #4CAF50' : 'none',
              cursor: 'pointer'
            }}
          >
            转账记录
          </button>
        </div>

        {activeTab === 'transfer' && (
          <form onSubmit={handleTransfer} className="transfer-form">
            <div className="form-group">
              <label>收款用户ID</label>
              <input
                type="text"
                name="toUserId"
                value={transferData.toUserId}
                onChange={handleInputChange}
                placeholder="请输入4位用户ID"
                maxLength="4"
                pattern="[A-Z0-9]{4}"
                required
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="form-group">
              <label>转账金额</label>
              <input
                type="number"
                name="amount"
                value={transferData.amount}
                onChange={handleInputChange}
                placeholder="请输入转账金额"
                min="1"
                max={userInfo?.balance || 0}
                required
              />
            </div>

            <div className="form-group">
              <label>备注（可选）</label>
              <input
                type="text"
                name="note"
                value={transferData.note}
                onChange={handleInputChange}
                placeholder="请输入备注"
                maxLength="50"
              />
            </div>

            {message && (
              <div className={`message ${message.includes('成功') ? 'success' : 'error'}`}
                style={{
                  padding: '10px',
                  borderRadius: '5px',
                  marginBottom: '15px',
                  background: message.includes('成功') ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                  color: message.includes('成功') ? '#4CAF50' : '#f44336'
                }}
              >
                {message}
              </div>
            )}

            <button type="submit" className="btn" disabled={loading}>
              {loading ? '转账中...' : '确认转账'}
            </button>
          </form>
        )}

        {activeTab === 'history' && (
          <div className="transfer-history">
            {transfers.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.7, padding: '20px' }}>
                暂无转账记录
              </p>
            ) : (
              <div className="transfer-list">
                {transfers.map((transfer, index) => (
                  <div key={index} className="transfer-item"
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        {transfer.transfer_type === 'sent' ? '转出' : '收到'}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.8 }}>
                        对方: {transfer.counterparty_id}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.7 }}>
                        {formatTime(transfer.created_at)}
                      </div>
                    </div>
                    <div style={{
                      color: transfer.transfer_type === 'sent' ? '#f44336' : '#4CAF50',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      {transfer.transfer_type === 'sent' ? '-' : '+'}{transfer.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
          padding: 25px;
          border-radius: 15px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .transfer-form .form-group {
          margin-bottom: 15px;
        }
        
        .transfer-form label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        .transfer-form input {
          width: 100%;
          padding: 10px;
          border: none;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.9);
          font-size: 14px;
        }
        
        .transfer-list {
          max-height: 300px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};

export default BalanceManager;