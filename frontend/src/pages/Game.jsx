/* frontend/src/pages/Game.jsx */
import React, { useState, useEffect, useCallback } from 'react';
import { numToName, cardToDisplayName } from '../utils';
import { fetchSegment, submitHand } from '../api';
import '../Game.css';

const Game = ({ user, onBack }) => {
    const [rounds, setRounds] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selection, setSelection] = useState({ head: [], mid: [], tail: [] });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    
    // 使用 useCallback 避免不必要的函数重建
    const loadSegment = useCallback(async () => {
        setLoading(true);
        setError('');
        // 参数: userId, roomId, segment, trackId
        const result = await fetchSegment(user.id, 1, 0, 1); 
        if (result && !result.error) {
            setRounds(result);
        } else {
            setError(result.error || '加载牌局失败');
        }
        setLoading(false);
    }, [user.id]); // 依赖 user.id，当用户切换时可以重新加载

    useEffect(() => {
        loadSegment();
    }, [loadSegment]);

    const handleCardClick = (card, fromDun = null, fromIndex = -1) => {
        setError('');
        let nextSelection = { ...selection };

        if (fromDun) { // 将牌从一个墩移出
            nextSelection[fromDun] = nextSelection[fromDun].filter((_, i) => i !== fromIndex);
        }

        // 将牌添加到当前选择的墩
        let dunKeys = ['head', 'mid', 'tail'];
        let added = false;
        for (let key of dunKeys) {
            const limit = key === 'head' ? 3 : 5;
            if (nextSelection[key].length < limit) {
                if(!fromDun || fromDun !== key) { // 防止从一个墩移动到自身
                    nextSelection[key].push(card);
                    added = true;
                    break;
                }
            }
        }
        
        if(fromDun && !added) { // 如果是从墩上移除但没有添加到新的墩（例如，当目标墩已满时），则将其放回手牌
             // 实际上，用户界面会自动将其放回手牌区
        }

        setSelection(nextSelection);
    };
    
    const resetSelection = () => {
        setSelection({ head: [], mid: [], tail: [] });
        setError('');
    }

    const handleSubmit = async () => {
        const { head, mid, tail } = selection;
        if (head.length !== 3 || mid.length !== 5 || tail.length !== 5) {
            setError('墩位牌数不正确，请重新摆放');
            return;
        }

        setError('');
        setLoading(true);
        const round = rounds[currentIndex];
        const result = await submitHand(user.id, 1, round.round_id, 1, head, mid, tail);

        if (result.success) {
            if (currentIndex < rounds.length - 1) {
                setCurrentIndex(currentIndex + 1);
                resetSelection();
            } else {
                alert("本段10局已全部提交！");
                onBack(); // 返回大厅
            }
        } else {
            setError(result.error || '提交失败，请检查牌型');
        }
        setLoading(false);
    };

    if (loading && rounds.length === 0) return <div>加载中...</div>;
    if (error && rounds.length === 0) return <div><p style={{color: 'red'}}>{error}</p><button onClick={loadSegment}>重试</button></div>;
    if (rounds.length === 0) return <div>没有可玩的牌局。</div>;

    const currentCards = rounds[currentIndex].cards;
    const selectedCards = new Set([...selection.head, ...selection.mid, ...selection.tail]);
    const handCards = currentCards.filter(c => !selectedCards.has(c));

    const renderDun = (dunName, limit) => (
        <div className="dun-slot">
            <strong>{dunName.toUpperCase()} ({selection[dunName].length}/{limit}):</strong>
            <div className="card-container">
                {selection[dunName].map((c, i) => (
                    <img key={i} src={`/cards/${numToName(c)}.svg`} alt={cardToDisplayName(c)} onClick={() => handleCardClick(c, dunName, i)} />
                ))}
            </div>
        </div>
    );

    return (
        <div className="game-screen">
            <div className="game-header">
                <span>玩家: {user.short_id}</span>
                <span>局: {currentIndex + 1} / {rounds.length}</span>
                <button onClick={onBack} style={{float:'right'}}>返回大厅</button>
            </div>
            
            {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

            <div className="selection-area">
                {renderDun('head', 3)}
                {renderDun('mid', 5)}
                {renderDun('tail', 5)}
            </div>

            <div className="hand-area">
                <strong>手牌:</strong>
                <div className="card-container">
                    {handCards.map(c => (
                        <img key={c} src={`/cards/${numToName(c)}.svg`} alt={cardToDisplayName(c)} onClick={() => handleCardClick(c)} />
                    ))}
                </div>
            </div>

            <div className="game-actions">
                <button onClick={resetSelection} disabled={loading}>重置</button>
                <button onClick={handleSubmit} disabled={loading || selectedCards.size !== 13}>
                    {loading ? '提交中...' : '确认提交'}
                </button>
            </div>
        </div>
    );
};

export default Game;
