import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getCardImg } from '../api';

const GameRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [rounds, setRounds] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [hand, setHand] = useState([]);
  const [head, setHead] = useState([]);
  const [mid, setMid] = useState([]);
  const [tail, setTail] = useState([]);
  const [submittedData, setSubmittedData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCards = useCallback(async () => {
    try {
      const res = await api.get(`game.php?action=get_cards&roomId=${roomId}`);
      setRounds(res.data.rounds);
      setHand(res.data.rounds[0].cards);
      setLoading(false);
    } catch (err) {
      alert("无法获取卡牌，可能房间已到期");
      navigate('/lobby');
    }
  }, [roomId, navigate]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const selectCard = (val) => {
    if (head.length < 3) setHead([...head, val]);
    else if (mid.length < 5) setMid([...mid, val]);
    else if (tail.length < 5) setTail([...tail, val]);
    else return;
    setHand(hand.filter(c => c !== val));
  };

  const resetCurrent = () => {
    setHand([...hand, ...head, ...mid, ...tail]);
    setHead([]); setMid([]); setTail([]);
  };

  const handleNext = async () => {
    if (head.length + mid.length + tail.length !== 13) return alert("请摆完所有牌");
    
    const currentSolution = { roundId: rounds[currentIdx].roundId, head, mid, tail };
    const newData = [...submittedData, currentSolution];
    
    if (currentIdx < 9) {
      setSubmittedData(newData);
      const next = currentIdx + 1;
      setCurrentIdx(next);
      setHand(rounds[next].cards);
      setHead([]); setMid([]); setTail([]);
    } else {
      setLoading(true);
      try {
        await api.post(`game.php?action=submit_segment&roomId=${roomId}`, { data: JSON.stringify(newData) });
        alert("本段10局理牌成功提交！");
        window.location.reload();
      } catch (err) {
        alert("提交失败");
        setLoading(false);
      }
    }
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="game-container">
      <div className="game-info">
        <span>房间: {roomId}</span>
        <span>当前: {currentIdx + 1} / 10 局</span>
      </div>

      <div className="slots">
        <div className="slot">头道: {head.map(v => <img key={v} src={getCardImg(v)} onClick={() => {setHead(head.filter(x=>x!==v)); setHand([...hand, v])}} />)}</div>
        <div className="slot">中道: {mid.map(v => <img key={v} src={getCardImg(v)} onClick={() => {setMid(mid.filter(x=>x!==v)); setHand([...hand, v])}} />)}</div>
        <div className="slot">尾道: {tail.map(v => <img key={v} src={getCardImg(v)} onClick={() => {setTail(tail.filter(x=>x!==v)); setHand([...hand, v])}} />)}</div>
      </div>

      <div className="my-hand">
        {hand.map(v => <img key={v} src={getCardImg(v)} onClick={() => selectCard(v)} />)}
      </div>

      <div className="btns">
        <button onClick={resetCurrent}>重摆</button>
        <button onClick={handleNext}>{currentIdx === 9 ? '提交整段' : '下一局'}</button>
      </div>
    </div>
  );
};

export default GameRoom;
