import React, { useState, useEffect } from 'react';
import { request } from '../api';

export default function SessionList({ user, onJoin }) {
  const [sessions, setSessions] = useState([]);
  const [showManager, setShowManager] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [target, setTarget] = useState(null);
  const [amount, setAmount] = useState('');

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    const res = await request('get_sessions');
    if (res) setSessions(res);
  };

  const handleBook = async (sid) => {
    const res = await request('book_session', { user_id: user.id, session_id: sid });
    if (res.success) { alert('预约成功！'); loadSessions(); } 
    else alert(res.error);
  };

  const handleTransfer = async () => {
    const res = await request('transfer', { from_id: user.id, to_uid: target.uid, amount: parseInt(amount) });
    if (res.success) { alert('赠送成功'); window.location.reload(); }
    else alert(res.error);
  };

  if (showManager) {
    return (
      <div style={{ padding: '20px', background: '#121212', height: '100%' }}>
        <button onClick={() => setShowManager(false)} className="red-btn">返回预约</button>
        <h3 style={{color:'#f1c40f'}}>积分管理</h3>
        <p>我的 ID: {user.uid} | 积分: {user.points}</p>
        <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
          <input placeholder="搜索手机号" onChange={e => setSearchPhone(e.target.value)} />
          <button onClick={async () => {
            const res = await request('search', { phone: searchPhone });
            if (res.uid) setTarget(res); else alert('用户不存在');
          }}>查找</button>
        </div>
        {target && (
          <div style={{marginTop:'20px', background:'#222', padding:'15px', borderRadius:'10px'}}>
            <p>赠送给: {target.uid} ({target.phone})</p>
            <input type="number" placeholder="金额" onChange={e => setAmount(e.target.value)} />
            <button onClick={handleTransfer} className="gold-btn" style={{width:'100%', marginTop:'10px'}}>确认赠送</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', background: '#121212', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <span style={{color:'#f1c40f'}}>ID: {user.uid} | {user.points}分</span>
        <button onClick={() => setShowManager(true)} className="gold-btn" style={{padding:'5px 10px'}}>积分管理</button>
      </div>
      
      <button onClick={onJoin} className="green-btn" style={{width:'100%', padding:'15px', marginBottom:'20px'}}>进入我的对局</button>

      <h4 style={{borderBottom:'1px solid #333', paddingBottom:'10px'}}>可用预约场次</h4>
      {sessions.map(s => (
        <div key={s.id} style={{ background:'#222', padding:'15px', borderRadius:'10px', marginBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <div style={{fontSize:'14px'}}>场次 ID: {s.id}</div>
            <div style={{fontSize:'12px', color:'#aaa'}}>结算: {s.settle_time}</div>
          </div>
          <button onClick={() => handleBook(s.id)} className="blue-btn">预约</button>
        </div>
      ))}
    </div>
  );
}