import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getCardImg } from '../api';

const GameRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  // 游戏状态
  const [loading, setLoading] = useState(true);
  const [segmentRounds, setSegmentRounds] = useState([]); // 存储10局的所有手牌
  const [currentIndex, setCurrentIndex] = useState(0);    // 当前是第几局 (0-9)
  const [submissions, setSubmissions] = useState([]);     // 存储已完成的理牌方案
  
  // 当前局地理牌状态
  const [hand, setHand] = useState([]);
  const [head, setHead] = useState([]);
  const [mid, setMid] = useState([]);
  const [tail, setTail] = useState([]);

  // 1. 获取当前段的数据
  const fetchSegment = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/game.php?action=get_cards&roomId=${roomId}`);
      setSegmentRounds(res.data.rounds); // 后端返回 10 局数据
      setHand(res.data.rounds[0].cards);
      setLoading(false);
    } catch (err) {
      alert("获取对局失败或房间已结束");
      navigate('/lobby');
    }
  }, [roomId, navigate]);

  useEffect(() => { fetchSegment(); }, [fetchSegment]);

  // 2. 理牌逻辑：点击卡牌分配位置
  const handleCardClick = (cardValue) => {
    if (head.length < 3) {
      setHead([...head, cardValue]);
    } else if (mid.length < 5) {
      setMid([...mid, cardValue]);
    } else if (tail.length < 5) {
      setTail([...tail, cardValue]);
    }
    setHand(hand.filter(c => c !== cardValue));
  };

  // 3. 撤回单张牌
  const removeCard = (cardValue, rowType) => {
    if (rowType === 'head') setHead(head.filter(c => c !== cardValue));
    if (rowType === 'mid') setMid(mid.filter(c => c !== cardValue));
    if (rowType === 'tail') setTail(tail.filter(c => c !== cardValue));
    setHand([...hand, cardValue]);
  };

  // 4. 完成当前局，进入下一局
  const nextRound = () => {
    if (head.length + mid.length + tail.length !== 13) {
      alert("请先摆放完所有卡牌");
      return;
    }

    const currentSolution = { head, mid, tail, roundId: segmentRounds[currentIndex].roundId };
    const newSubmissions = [...submissions, currentSolution];
    setSubmissions(newSubmissions);

    if (currentIndex < 9) {
      // 进入下一局
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setHand(segmentRounds[nextIdx].cards);
      setHead([]); setMid([]); setTail([]);
    } else {
      // 10局全满，提交后端
      submitFullSegment(newSubmissions);
    }
  };

  // 5. 提交整段
  const submitFullSegment = async (allData) => {
    try {
      setLoading(true);
      await axios.post(`/api/game.php?action=submit_segment&roomId=${roomId}`, {
        data: JSON.stringify(allData)
      });
      alert("本段10局已提交结算！");
      // 重新拉取下一段或刷新
      window.location.reload(); 
    } catch (err) {
      alert("提交失败：" + err.response.data.msg);
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">加载对局中...</div>;

  return (
    <div className="game-room">
      <div className="game-header">
        <span>房间: {roomId}</span>
        <span>进度: {currentIndex + 1} / 10 局</span>
      </div>

      <div className="board">
        <div className="slot head-slot">
          <label>头道 (3张)</label>
          <div className="cards-row">
            {head.map(c => <img key={c} src={getCardImg(c)} onClick={() => removeCard(c, 'head')} />)}
          </div>
        </div>

        <div className="slot mid-slot">
          <label>中道 (5张)</label>
          <div className="cards-row">
            {mid.map(c => <img key={c} src={getCardImg(c)} onClick={() => removeCard(c, 'mid')} />)}
          </div>
        </div>

        <div className="slot tail-slot">
          <label>尾道 (5张)</label>
          <div className="cards-row">
            {tail.map(c => <img key={c} src={getCardImg(c)} onClick={() => removeCard(c, 'tail')} />)}
          </div>
        </div>
      </div>

      <div className="player-hand">
        <label>待选手牌</label>
        <div className="cards-row">
          {hand.map(c => <img key={c} src={getCardImg(c)} onClick={() => handleCardClick(c)} />)}
        </div>
      </div>

      <div className="controls">
        <button className="reset-btn" onClick={() => {
          setHand([...hand, ...head, ...mid, ...tail]);
          setHead([]); setMid([]); setTail([]);
        }}>重摆</button>
        
        <button className="next-btn" onClick={nextRound}>
          {currentIndex === 9 ? "提交本轮战果" : "下一局"}
        </button>
      </div>
    </div>
  );
};

export default GameRoom;