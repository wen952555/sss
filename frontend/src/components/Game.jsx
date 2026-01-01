/**
 * 路径: frontend/src/components/Game.jsx
 */
import React, { useState } from 'react';
import { request } from '../api';

export default function Game({ user, onOpenLobby }) {
  const [rows, setRows] = useState({ front: [], mid: [], back: [] });
  const [selected, setSelected] = useState([]);

  const handleDeal = async () => {
    const res = await request('deal');
    if (res.cards) {
      setRows({
        front: res.cards.slice(0, 3),
        mid: res.cards.slice(3, 8),
        back: res.cards.slice(8, 13)
      });
      setSelected([]);
    }
  };

  const moveSelectedTo = (target) => {
    if (selected.length === 0) return;
    const limits = { front: 3, mid: 5, back: 5 };
    let newRows = { ...rows };
    const toMove = [...selected];
    
    Object.keys(newRows).forEach(r => newRows[r] = newRows[r].filter(c => !toMove.includes(c)));
    
    let pool = [...newRows[target], ...toMove];
    newRows[target] = pool.slice(0, limits[target]);
    let overflow = pool.slice(limits[target]);

    if (overflow.length > 0) {
      ['back', 'mid', 'front'].forEach(r => {
        let space = limits[r] - newRows[r].length;
        if (space > 0) newRows[r] = [...newRows[r], ...overflow.splice(0, space)];
      });
    }
    setRows(newRows);
    setSelected([]);
  };

  const autoSort = () => {
    const all = [...rows.front, ...rows.mid, ...rows.back];
    const vMap = {ace:14, king:13, queen:12, jack:11};
    const sorted = all.sort((a, b) => {
      const va = vMap[a.split('_')[0]] || parseInt(a);
      const vb = vMap[b.split('_')[0]] || parseInt(b);
      return vb - va;
    });
    setRows({ back: sorted.slice(0, 5), mid: sorted.slice(5, 10), front: sorted.slice(10, 13) });
  };

  const handleSubmit = async () => {
    const res = await request('submit_hand', { ...rows, user_id: user.id });
    if (res.success) { alert(res.msg); window.location.reload(); }
    else alert(res.error);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部状态栏 */}
      <div style={{ height: '50px', display: 'flex', justifyContent: 'space-between', padding: '0 15px', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
        <span style={{color: '#f1c40f', fontSize: '14px'}}>ID: {user.uid} | {user.points}分</span>
        <button onClick={onOpenLobby} className="gold-btn" style={{ padding: '5px 12px', fontSize: '12px' }}>积分管理</button>
      </div>

      {/* 牌局区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px' }}>
        {['front', 'mid', 'back'].map(r => (
          <div key={r} onClick={() => moveSelectedTo(r)} style={{
            background: 'rgba(0,0,0,0.2)', margin: '6px 0', borderRadius: '12px', padding: '8px', minHeight: '110px'
          }}>
            <div style={{fontSize:'11px', color:'#777', marginBottom:'5px'}}>{r.toUpperCase()}</div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {rows[r].map(c => (
                <img key={c} src={`/cards/${c}`} className={`card-img ${selected.includes(c) ? 'selected' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setSelected(prev => prev.includes(c) ? prev.filter(i=>i!==c) : [...prev, c]); }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 底部按钮栏 */}
      <div style={{ height: '80px', display: 'flex', gap: '10px', padding: '15px' }}>
        <button onClick={handleDeal} className="blue-btn" style={{flex:1}}>洗牌</button>
        <button onClick={autoSort} className="gold-btn" style={{flex:1}}>智能理牌</button>
        <button onClick={handleSubmit} className="green-btn" style={{flex:1.5}}>确认提交</button>
      </div>
    </div>
  );
}
