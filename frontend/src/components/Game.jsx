// frontend/src/components/Game.jsx
import React, { useState, useEffect } from 'react';
import { request } from '../api';

export default function Game({ user }) {
    const [rows, setRows] = useState({ front: [], mid: [], back: [] });
    const [selectedCards, setSelectedCards] = useState([]); // 选中的图片名数组

    const handleDeal = async () => {
        const res = await request('deal');
        if (res.cards) {
            // 开局自动分堆 3-5-5
            setRows({
                front: res.cards.slice(0, 3),
                mid: res.cards.slice(3, 8),
                back: res.cards.slice(8, 13)
            });
            setSelectedCards([]);
        }
    };

    // 切换选择
    const toggleSelect = (card) => {
        setSelectedCards(prev => 
            prev.includes(card) ? prev.filter(c => c !== card) : [...prev, card]
        );
    };

    // 移动选中的牌到指定行
    const moveSelectedTo = (targetRow) => {
        if (selectedCards.length === 0) return;

        const maxMap = { front: 3, mid: 5, back: 5 };
        let newRows = { ...rows };

        // 1. 从所有行中移除选中的牌
        Object.keys(newRows).forEach(key => {
            newRows[key] = newRows[key].filter(c => !selectedCards.includes(c));
        });

        // 2. 尝试放入目标行
        const spaceLeft = maxMap[targetRow] - newRows[targetRow].length;
        const toMove = selectedCards.slice(0, spaceLeft);
        const remain = selectedCards.slice(spaceLeft); // 塞不下的

        newRows[targetRow] = [...newRows[targetRow], ...toMove];

        // 3. 塞不下的牌回到原来的位置（这里简单处理：放回有空位的行）
        if (remain.length > 0) {
            Object.keys(newRows).forEach(key => {
                const space = maxMap[key] - newRows[key].length;
                const fill = remain.splice(0, space);
                newRows[key] = [...newRows[key], ...fill];
            });
        }

        setRows(newRows);
        setSelectedCards([]);
    };

    // 智能理牌：按牌力排序
    const autoSort = () => {
        const allCards = [...rows.front, ...rows.mid, ...rows.back];
        // 简单策略：全集按点数排序，然后从大到小填入 尾->中->头
        // 复杂理牌需要后端算法，这里演示前端逻辑
        const sorted = allCards.sort((a, b) => {
            const val = c => {
                const v = c.split('_')[0];
                const map = {ace:14, king:13, queen:12, jack:11};
                return map[v] || parseInt(v);
            };
            return val(b) - val(a);
        });

        setRows({
            front: sorted.slice(10, 13),
            mid: sorted.slice(5, 10),
            back: sorted.slice(0, 5)
        });
    };

    const submit = async () => {
        const res = await request('submit_hand', { ...rows, user_id: user.id });
        if (res.success) {
            alert(res.msg);
            window.location.reload();
        } else {
            alert(res.error);
        }
    };

    return (
        <div style={{ padding: '15px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button onClick={handleDeal} style={{flex:1}}>重新发牌</button>
                <button onClick={autoSort} style={{flex:1, background:'#2980b9', boxShadow:'0 3px 0 #1c5982'}}>智能理牌</button>
            </div>

            {['front', 'mid', 'back'].map(rowKey => (
                <div key={rowKey} className="row-container" onClick={() => moveSelectedTo(rowKey)}>
                    <div className="row-title">
                        <span>{rowKey === 'front' ? '头道 (3张)' : rowKey === 'mid' ? '中道 (5张)' : '尾道 (5张)'}</span>
                        <span>{rows[rowKey].length} / {rowKey === 'front' ? 3 : 5}</span>
                    </div>
                    <div className="card-grid">
                        {rows[rowKey].map(card => (
                            <img 
                                key={card}
                                src={`/cards/${card}`} 
                                className={`card-img ${selectedCards.includes(card) ? 'selected' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation(); // 阻止触发行的移动事件
                                    toggleSelect(card);
                                }}
                            />
                        ))}
                    </div>
                </div>
            ))}

            <div style={{ marginTop: '20px' }}>
                <button onClick={submit} style={{ width: '100%', padding: '15px', fontSize: '18px', background: '#27ae60', boxShadow: '0 4px 0 #1e8449' }}>确认出牌</button>
            </div>
            
            <p style={{fontSize:'12px', color:'#7f8c8d', textAlign:'center', marginTop:'10px'}}>
                提示：点击扑克牌可多选，点击目标牌墩空白处即可移动
            </p>
        </div>
    );
}
