/* frontend/src/pages/Game.jsx */
import React, { useState, useEffect } from 'react';
import { numToName } from '../utils';
import api from '../api';

const Game = () => {
    const [rounds, setRounds] = useState([]); // 当前段10局牌
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selection, setSelection] = useState({ head: [], mid: [], tail: [] });

    const fetchSegment = async () => {
        const res = await api.post('/game.php?action=fetch_segment', {
            user_id: 1, room_id: 1, segment: 0, track_id: 1
        });
        setRounds(res);
    };

    useEffect(() => { fetchSegment(); }, []);

    const selectCard = (card) => {
        // 自动填充逻辑：头3、中5、尾5
        if (selection.head.length < 3) setSelection({...selection, head: [...selection.head, card]});
        else if (selection.mid.length < 5) setSelection({...selection, mid: [...selection.mid, card]});
        else if (selection.tail.length < 5) setSelection({...selection, tail: [...selection.tail, card]});
    };

    const submitRound = async () => {
        await api.post('/game.php?action=submit', {
            round_id: rounds[currentIndex].round_id,
            ...selection
        });
        if (currentIndex < 9) {
            setCurrentIndex(currentIndex + 1);
            setSelection({ head: [], mid: [], tail: [] });
        } else {
            alert("分段提交成功！等待结算结果。");
        }
    };

    if (rounds.length === 0) return <div>加载中...</div>;

    return (
        <div className="game-screen">
            <div className="status">第 {currentIndex + 1} / 10 局</div>
            <div className="slots">
                <div className="row">头: {selection.head.map(c => <img src={`/cards/${numToName(c)}.svg`} />)}</div>
                <div className="row">中: {selection.mid.map(c => <img src={`/cards/${numToName(c)}.svg`} />)}</div>
                <div className="row">尾: {selection.tail.map(c => <img src={`/cards/${numToName(c)}.svg`} />)}</div>
            </div>
            <div className="hand">
                {rounds[currentIndex].cards.filter(c => 
                    ![...selection.head, ...selection.mid, ...selection.tail].includes(c)
                ).map(c => (
                    <img key={c} src={`/cards/${numToName(c)}.svg`} onClick={() => selectCard(c)} />
                ))}
            </div>
            <button onClick={submitRound}>提交此局</button>
        </div>
    );
};

export default Game;
