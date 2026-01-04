import React, { useState, useEffect } from 'react';
import { request } from '../api';

export default function SessionList({ user, onEnterGame }) {
  const [sessions, setSessions] = useState([]);
  const [showManager, setShowManager] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [target, setTarget] = useState(null);
  const [amt, setAmt] = useState('');

  useEffect(() => {
    request('get_sessions').then(res => res && setSessions(res));
  }, []);

  const book = async (sid) => {
    const res = await request('book_session', { session_id: sid, user_id: user.id });
    if (res.success) { alert('预约成功'); onEnterGame(); } else alert(res.error);
  };

  if (showManager) {
    return (
      <div style={{ padding: '20px' }}>
        <button onClick={() => setShowManager(false)} className="blue-btn">返回列表</button>
        <h3>积分管理</h3>
        <p>我的ID: {user.uid} | 积分: {user.points}</p>
        <input placeholder="手机号搜索" onChange={e => setSearchPhone(e.target.value)} />
        <button onClick={async () => {
          const res = await request('search', { phone: searchPhone });
          if (res.uid) setTarget(res); else alert('未找到');
        }}>查找</button>
        {target && (
          <div style={{marginTop:20}}>
            <p>赠送给: {target.uid}</p>
            <input type="number" placeholder="金额" onChange={e => setAmt(e.target.value)} />
            <button onClick={async () => {
              const res = await request('transfer', { from_id:user.id, to_uid:target.uid, amount:parseInt(amt) });
              if (res.success) alert('成功'); else alert(res.error);
            }} className="gold-btn">确认赠送</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', height: '100%', overflowY:'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom:20 }}>
        <span>ID: {user.uid} | {user.points}分</span>
        <button onClick={() => setShowManager(true)} className="gold-btn">积分中心</button>
      </div>
      <button onClick={onEnterGame} className="green-btn" style={{width:'100%', marginBottom:30}}>进入我已预约的场次</button>
      <h4>可用预约场次 (30分钟截止)</h4>
      {sessions.map(s => (
        <div key={s.id} style={{ background:'#1a2e22', padding:15, borderRadius:10, marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <div>{new Date(s.settle_time).getHours()}点场</div>
            <small style={{color:'#888'}}>{s.settle_time}</small>
          </div>
          <button onClick={() => book(s.id)} className="blue-btn">预约</button>
        </div>
      ))}
    </div>
  );
}