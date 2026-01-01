// frontend/src/components/Game.jsx
import React, { useState } from 'react';
import { request } from '../api';

export default function Game({ user }) {
  const [hand, setHand] = useState([]); // 还没选的牌
  const [segments, setSegments] = useState({ front: [], mid: [], back: [] });

  const startNewGame = async () => {
    const res = await request('deal');
    if (res.cards) {
      setHand(res.cards);
      setSegments({ front: [], mid: [], back: [] });
    }
  };

  const moveTo = (card, target) => {
    // 检查各段限制
    if (target === 'front' && segments.front.length >= 3) return;
    if (target === 'mid' && segments.mid.length >= 5) return;
    if (target === 'back' && segments.back.length >= 5) return;

    setHand(prev => prev.filter(c => c !== card));
    setSegments(prev => ({ ...prev, [target]: [...prev[target], card] }));
  };

  const resetCard = (card, from) => {
    setSegments(prev => ({ ...prev, [from]: prev[from].filter(c => c !== card) }));
    setHand(prev => [...prev, card]);
  };

  const submitHand = async () => {
    if (segments.front.length + segments.mid.length + segments.back.length !== 13) {
        return alert("请分完13张牌");
    }
    const res = await request('submit_hand', { 
        ...segments, 
        user_id: user.id 
    });
    if (res.success) {
        alert(res.msg);
        window.location.reload(); // 刷新积分
    } else {
        alert(res.error);
    }
  };

  return (
    <div style={{ padding: '10px', maxWidth: '600px', margin: 'auto' }}>
      <button onClick={startNewGame} style={{width:'100%', marginBottom:'10px'}}>重新发牌</button>

      {/* 分段区域 */}
      {['front', 'mid', 'back'].map(seg => (
        <div key={seg} style={{ background: 'rgba(255,255,255,0.1)', margin: '5px 0', padding: '10px', borderRadius: '8px' }}>
          <small>{seg === 'front' ? '头道 (3张)' : seg === 'mid' ? '中道 (5张)' : '尾道 (5张)'}</small>
          <div style={{ display: 'flex', minHeight: '60px' }}>
            {segments[seg].map(c => (
              <img key={c} src={`/cards/${c}`} onClick={() => resetCard(c, seg)} style={{ width: '45px', marginRight: '5px' }} />
            ))}
          </div>
        </div>
      ))}

      {/* 待选手牌 */}
      <div style={{ marginTop: '20px', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
        <p>点击下方扑克牌分段：</p>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {hand.map(c => (
            <div key={c} style={{ margin: '2px', border: '1px solid #555' }}>
              <img src={`/cards/${c}`} style={{ width: '50px' }} onClick={() => {
                const target = segments.front.length < 3 ? 'front' : (segments.mid.length < 5 ? 'mid' : 'back');
                moveTo(c, target);
              }} />
            </div>
          ))}
        </div>
      </div>

      {hand.length === 0 && segments.back.length === 5 && (
        <button onClick={submitHand} style={{ width: '100%', marginTop: '20px', padding: '15px', background: '#e67e22' }}>确认出牌</button>
      )}
    </div>
  );
}