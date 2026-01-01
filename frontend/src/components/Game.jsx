/**
 * 路径: frontend/src/components/Game.jsx
 */
import React, { useState } from 'react';
import { request } from '../api';

export default function Game({ user }) {
  const [rows, setRows] = useState({ front: [], mid: [], back: [] });
  const [selected, setSelected] = useState([]);

  const deal = async () => {
    const res = await request('deal');
    if (res.cards) {
      setRows({ front: res.cards.slice(0, 3), mid: res.cards.slice(3, 8), back: res.cards.slice(8, 13) });
      setSelected([]);
    }
  };

  const toggleSelect = (card) => {
    setSelected(prev => prev.includes(card) ? prev.filter(c => c !== card) : [...prev, card]);
  };

  const moveSelectedTo = (target) => {
    if (selected.length === 0) return;
    const limits = { front: 3, mid: 5, back: 5 };
    let newRows = { ...rows };
    const toMove = [...selected];

    // 移除
    Object.keys(newRows).forEach(r => newRows[r] = newRows[r].filter(c => !toMove.includes(c)));
    
    // 放入
    let pool = [...newRows[target], ...toMove];
    newRows[target] = pool.slice(0, limits[target]);
    let overflow = pool.slice(limits[target]);

    // 溢出回填
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

  const submit = async () => {
    const res = await request('submit_hand', { ...rows, user_id: user.id });
    if (res.success) { alert(res.msg); window.location.reload(); }
    else alert(res.error);
  };

  return (
    <div style={{ maxWidth: '500px', margin: 'auto' }}>
      <div style={{ display: 'flex', gap: '10px', padding: '10px' }}>
        <button onClick={deal} style={{flex:1}}>重新洗牌</button>
        <button onClick={autoSort} style={{flex:1, background:'#2980b9'}}>智能理牌</button>
      </div>

      {['front', 'mid', 'back'].map(r => (
        <div key={r} className="row-container" onClick={() => moveSelectedTo(r)}>
          <div className="row-header">
            <span>{r === 'front' ? '前道' : r === 'mid' ? '中道' : '后道'}</span>
            <span>{rows[r].length} / {r === 'front' ? 3 : 5}</span>
          </div>
          <div className="card-grid">
            {rows[r].map(c => (
              <img key={c} src={`/cards/${c}`} className={`card-img ${selected.includes(c) ? 'selected' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleSelect(c); }} />
            ))}
          </div>
        </div>
      ))}

      <div style={{ padding: '10px' }}>
        <button onClick={submit} style={{ width: '100%', background: '#27ae60' }}>确认出牌</button>
      </div>
    </div>
  );
}
