import React, { useState, useEffect } from 'react';
import { request } from '../api';

export default function Board({ user, onBack }) {
  const [tables, setTables] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [carriageId, setCarriageId] = useState(null);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    loadGame();
  }, []);

  const loadGame = async () => {
    const res = await request('get_my_game', { user_id: user.id });
    if (res.tables) {
      setTables(res.tables);
      setCarriageId(res.carriage_id);
    } else {
      alert(res.error || "当前没有正在进行的预约场");
      onBack();
    }
  };

  const toggleSelect = (card) => {
    setSelected(prev => prev.includes(card) ? prev.filter(c => c !== card) : [...prev, card]);
  };

  const moveSelectedTo = (targetRow) => {
    if (selected.length === 0) return;
    const limits = { front: 3, mid: 5, back: 5 };
    let newTables = [...tables];
    let current = { ...newTables[currentIdx] };
    const toMove = [...selected];

    // 从所有行移除选中的牌
    ['front', 'mid', 'back'].forEach(r => {
      current[r] = current[r].filter(c => !toMove.includes(c));
    });

    // 放入目标行并处理溢出
    let pool = [...current[targetRow], ...toMove];
    current[targetRow] = pool.slice(0, limits[targetRow]);
    let overflow = pool.slice(limits[targetRow]);

    if (overflow.length > 0) {
      ['back', 'mid', 'front'].forEach(r => {
        let space = limits[r] - current[r].length;
        if (space > 0) current[r] = [...current[r], ...overflow.splice(0, space)];
      });
    }

    current.is_manual = 1; // 标记为已手动理牌
    newTables[currentIdx] = current;
    setTables(newTables);
    setSelected([]);
  };

  const handleSave = async () => {
    const table = tables[currentIdx];
    const res = await request('save_table', {
      user_id: user.id,
      carriage_id: carriageId,
      table_index: currentIdx,
      front: table.front,
      mid: table.mid,
      back: table.back
    });
    if (res.success) {
      if (currentIdx < 9) setCurrentIdx(currentIdx + 1);
      else alert('所有10局牌已保存成功，请等待场次结算时间。');
    }
  };

  if (tables.length === 0) return <div style={{padding: '50px', textAlign:'center'}}>正在进入车厢...</div>;

  const table = tables[currentIdx];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a2113' }}>
      <div style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.5)' }}>
        <button onClick={onBack} className="red-btn" style={{padding:'5px 10px'}}>退出</button>
        <span style={{color:'#f1c40f'}}>第 {currentIdx + 1} / 10 局 ({table.is_manual ? '手动' : 'AI预设'})</span>
        <div />
      </div>

      <div style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {['front', 'mid', 'back'].map(row => (
          <div key={row} className="row-container" onClick={() => moveSelectedTo(row)} 
            style={{background:'rgba(255,255,255,0.05)', margin:'5px 0', padding:'10px', borderRadius:'10px', minHeight:'100px'}}>
            <div style={{fontSize:'10px', color:'#aaa', marginBottom:'5px'}}>{row.toUpperCase()}</div>
            <div className="card-grid" style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
              {table[row].map(c => (
                <img key={c} src={`/cards/${c}`} 
                  className={`card-img ${selected.includes(c) ? 'selected' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(c); }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '15px', display: 'flex', gap: '10px' }}>
        <button onClick={() => currentIdx > 0 && setCurrentIdx(currentIdx - 1)} className="blue-btn" style={{flex:1}}>上一局</button>
        <button onClick={handleSave} className="green-btn" style={{flex:2}}>确认并保存</button>
      </div>
    </div>
  );
}