import React, { useState, useEffect } from 'react';
import { request } from '../api';

export default function Board({ user, onBack }) {
  const [tables, setTables] = useState([]);
  const [cur, setCur] = useState(0);
  const [cid, setCid] = useState(null);
  const [sel, setSel] = useState([]);

  useEffect(() => {
    request('get_my_game', { user_id: user.id }).then(res => {
      if (res.tables) { setTables(res.tables); setCid(res.carriage_id); }
      else { alert(res.error); onBack(); }
    });
  }, []);

  const move = (row) => {
    if (sel.length === 0) return;
    const limits = { front:3, mid:5, back:5 };
    let newT = [...tables];
    let t = { ...newT[cur] };
    ['front','mid','back'].forEach(r => t[r] = t[r].filter(c => !sel.includes(c)));
    let pool = [...t[row], ...sel];
    t[row] = pool.slice(0, limits[row]);
    let over = pool.slice(limits[row]);
    if (over.length > 0) {
      ['back','mid','front'].forEach(r => {
        let s = limits[r] - t[r].length;
        if (s > 0) t[r] = [...t[r], ...over.splice(0, s)];
      });
    }
    t.is_manual = 1;
    newT[cur] = t;
    setTables(newT); setSel([]);
  };

  const save = async () => {
    const t = tables[cur];
    await request('save_hand', { user_id: user.id, carriage_id: cid, table_index: cur, front: t.front, mid: t.mid, back: t.back });
    if (cur < 9) setCur(cur + 1); else alert('已完成全部10局理牌！');
  };

  if (tables.length === 0) return <div style={{padding:50}}>加载中...</div>;
  const t = tables[cur];

  return (
    <div style={{ height: '100%', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:10, background:'#000', display:'flex', justifyContent:'space-between'}}>
        <button onClick={onBack}>退出</button>
        <span>第 {cur + 1} / 10 局 ({t.is_manual?'手动':'AI'})</span>
        <div />
      </div>
      <div style={{ flex:1, padding:10 }}>
        {['front','mid','back'].map(r => (
          <div key={r} onClick={() => move(r)} style={{ background:'rgba(255,255,255,0.05)', margin:'10px 0', padding:10, borderRadius:10, minHeight:90 }}>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {t[r].map(c => <img key={c} src={`/cards/${c}`} className={sel.includes(c)?'selected':''} onClick={(e)=>{e.stopPropagation(); setSel(p=>p.includes(c)?p.filter(i=>i!==c):[...p,c])}} className="card-img" />)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding:20, display:'flex', gap:10 }}>
        <button onClick={()=>cur>0 && setCur(cur-1)} className="blue-btn" style={{flex:1}}>上一局</button>
        <button onClick={save} className="green-btn" style={{flex:2}}>确认并下一局</button>
      </div>
    </div>
  );
}