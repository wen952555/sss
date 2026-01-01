/**
 * 路径: frontend/src/components/Lobby.jsx
 */
import React, { useState } from 'react';
import { request } from '../api';

export default function Lobby({ user, onBack }) {
  const [searchPhone, setSearchPhone] = useState('');
  const [targetUser, setTargetUser] = useState(null);
  const [amount, setAmount] = useState('');

  const handleSearch = async () => {
    const res = await request('search', { phone: searchPhone });
    if (res.uid) setTargetUser(res);
    else alert('未找到该用户');
  };

  const handleTransfer = async () => {
    if (!targetUser || !amount) return;
    const res = await request('transfer', {
      from_id: user.id,
      to_uid: targetUser.uid,
      amount: parseInt(amount)
    });
    if (res.success) {
      alert('赠送成功！');
      window.location.reload();
    } else alert(res.error);
  };

  return (
    <div style={{ height: '100%', padding: '20px', background: '#121212', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0, color: '#f1c40f' }}>积分管理</h2>
        <button onClick={onBack} className="red-btn" style={{ padding: '8px 15px' }}>返回牌桌</button>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '15px' }}>
        <p>我的 ID: <b style={{color:'#f1c40f'}}>{user.uid}</b></p>
        <p>当前积分: <b style={{color:'#2ecc71'}}>{user.points}</b></p>
      </div>

      <div style={{ marginTop: '20px' }}>
        <p style={{fontSize:'14px', color:'#aaa'}}>搜索手机号查询 ID 并赠送：</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input placeholder="手机号" value={searchPhone} onChange={e => setSearchPhone(e.target.value)} />
          <button onClick={handleSearch} className="blue-btn" style={{ minWidth: '80px' }}>查找</button>
        </div>
      </div>

      {targetUser && (
        <div style={{ marginTop: '30px', borderTop: '1px solid #333', paddingTop: '20px' }}>
          <p>正在给用户 [<b style={{color:'#f1c40f'}}>{targetUser.uid}</b>] 赠送：</p>
          <input type="number" placeholder="输入赠送积分数量" value={amount} onChange={e => setAmount(e.target.value)} />
          <button onClick={handleTransfer} className="gold-btn" style={{ width: '100%', marginTop: '15px', padding: '15px' }}>
            立即确认赠送
          </button>
        </div>
      )}
    </div>
  );
}