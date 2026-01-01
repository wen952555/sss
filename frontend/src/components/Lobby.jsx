import React, { useState } from 'react';
import { request } from '../api';

export default function Lobby({ user, onLogout }) {
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [transfer, setTransfer] = useState({ to_uid: '', amount: '' });

  const handleSearch = async () => {
    const res = await request('search', { phone: searchPhone });
    if (res.uid) setSearchResult(res);
    else alert('未找到该手机号绑定的ID');
  };

  const handleTransfer = async () => {
    const res = await request('transfer', {
      from_id: user.id,
      to_uid: transfer.to_uid,
      amount: transfer.amount
    });
    if (res.success) {
      alert('赠送成功！请刷新页面查看余额');
      setTransfer({ to_uid: '', amount: '' });
    } else {
      alert(res.error);
    }
  };

  return (
    <div style={{ padding: '20px', borderBottom: '1px solid #2ecc71' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>ID: <b>{user.uid}</b> | 积分: <b>{user.points}</b></span>
        <button onClick={onLogout} style={{ background: '#e74c3c', color: 'white' }}>退出</button>
      </div>

      <div style={{ marginTop: '20px', background: 'rgba(0,0,0,0.2)', padding: '15px' }}>
        <h4>用户查询</h4>
        <input placeholder="输入手机号" onChange={e => setSearchPhone(e.target.value)} />
        <button onClick={handleSearch}>搜索</button>
        {searchResult && <p>查询结果 - UID: <b style={{color:'#f1c40f'}}>{searchResult.uid}</b></p>}
      </div>

      <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.2)', padding: '15px' }}>
        <h4>赠送积分</h4>
        <input 
          placeholder="接收者UID" 
          value={transfer.to_uid}
          onChange={e => setTransfer({...transfer, to_uid: e.target.value})} 
        />
        <input 
          type="number" 
          placeholder="数量" 
          value={transfer.amount}
          onChange={e => setTransfer({...transfer, amount: e.target.value})} 
        />
        <button onClick={handleTransfer}>确认赠送</button>
      </div>
    </div>
  );
}