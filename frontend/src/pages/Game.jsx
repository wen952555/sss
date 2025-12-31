import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { smartSort, getPatternName, getHandScore } from '../utils/pokerLogic';

// --- Sub-components ---

const Card = ({ card, isSelected, onClick }) => (
  <div onClick={onClick} className={`relative transition-all duration-200 transform ${isSelected ? 'ring-2 ring-yellow-400 z-30 scale-105 shadow-2xl' : 'z-10'}`}>
    <img src={`/cards/${card}.svg`} className="w-[18vw] max-w-[80px] h-auto rounded-md shadow-lg pointer-events-none" alt={card} />
  </div>
);

const GameRow = ({ title, cards, selected, onCardClick, onRowClick, isValid, score }) => (
  <div onClick={onRowClick} className={`w-full max-w-md p-4 rounded-2xl border-2 transition-colors ${onRowClick ? 'border-yellow-500/50 bg-white/10 hover:bg-white/20' : 'border-white/5 bg-black/20'}`}>
    <div className="flex justify-between items-center mb-2">
      <span className="text-xs font-bold text-white/40 uppercase">{title}</span>
      <span className={`text-xs font-bold ${isValid ? 'text-yellow-500' : 'text-red-500'}`}>{getPatternName(cards)} ({score})</span>
    </div>
    <div className="flex justify-center -space-x-8 md:-space-x-10">
      {cards.map((c, i) => <Card key={`${c}-${i}`} card={c} isSelected={selected.some(s => s === c)} onClick={() => onCardClick(c)} />)}
    </div>
  </div>
);

const WaitingRoom = ({ players = [] }) => (
    <div className="min-h-screen bg-gradient-to-b from-[#064e3b] to-[#022c22] flex flex-col justify-center items-center text-white p-6">
        <h2 className="text-2xl font-bold text-yellow-500 mb-2">等待其他玩家</h2>
        <p className="text-white/60 mb-8">本轮游戏将在所有玩家都确认出牌后开始比牌</p>
        <div className="w-full max-w-sm bg-black/20 border border-white/10 rounded-2xl p-6 space-y-4">
            {players.map((player, index) => (
                <div key={index} className="flex justify-between items-center animate-in fade-in duration-500" style={{animationDelay: `${index * 100}ms`}}>
                    <span className="font-bold text-white/80">玩家: {player.short_id}</span>
                    {player.submitted ? (
                        <span className="px-3 py-1 text-xs font-bold text-green-800 bg-green-400 rounded-full shadow-lg">Ready</span>
                    ) : (
                        <span className="px-3 py-1 text-xs font-bold text-yellow-800 bg-yellow-400 rounded-full animate-pulse">Waiting...</span>
                    )}
                </div>
            ))}
        </div>
    </div>
);

const ResultsDisplay = ({ results, onNextRound, playerShortId }) => (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in">
        <h2 className="text-4xl font-black italic text-yellow-500 mb-6 animate-bounce">SHOWDOWN!</h2>
        <p className="text-white/70 mb-8">Round {results.round} - 结算</p>
        <div className="w-full max-w-lg space-y-3">
            {results.details.map((player, index) => (
                <div key={index} className={`bg-white/10 p-4 rounded-xl border ${player.short_id === playerShortId ? 'border-yellow-500' : 'border-transparent'}`}>
                    <div className="flex justify-between items-center">
                        <p className="text-lg font-bold text-white">玩家: {player.short_id}</p>
                        <p className={`text-xl font-black ${player.round_score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {player.round_score >= 0 ? `+${player.round_score}` : player.round_score}
                        </p>
                    </div>
                    <p className="text-xs text-white/50">当前总积分: {player.new_total_points}</p>
                </div>
            ))}
        </div>
        <button onClick={onNextRound} className="mt-10 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-12 py-3 rounded-full font-bold uppercase tracking-wider shadow-lg hover:scale-105 transition-transform">
            开始下一轮
        </button>
    </div>
);

// --- Main Component ---

export default function Game() {
  const [gameState, setGameState] = useState('LOADING');
  const [gameData, setGameData] = useState(null);
  const [playerShortId, setPlayerShortId] = useState(null);
  const [rows, setRows] = useState({ head: [], mid: [], back: [] });
  const [handScores, setHandScores] = useState({ head: 0, mid: 0, back: 0 });
  const [isHandValid, setIsHandValid] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);
  const [results, setResults] = useState(null);
  const [playerStatuses, setPlayerStatuses] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const checkGameState = useCallback(async () => {
    try {
      const profileRes = await api.get('/profile.php');
      setPlayerShortId(profileRes.data.short_id);
      const res = await api.get('/get_game_state.php');
      const { status, ...data } = res.data;
      setGameState(status);
      if (status === 'my_turn') {
        setRows(smartSort(data.hand));
        setGameData({ game_id: data.game_id, round: data.round });
      } else if (status === 'waiting_for_others' || status === 'game_over') {
        setGameData({ game_id: data.game_id, round: data.round });
      }
    } catch (e) {
      const status = e.response?.data?.status;
      const message = e.response?.data?.message;
      if(status === 'no_game') {
        setError(message || '未找到您的有效比赛');
        setGameState('NO_GAME');
      } else {
        navigate('/login');
      }
    }
  }, [navigate]);

  useEffect(() => { checkGameState(); }, [checkGameState]);

  const validateAndScoreHand = useCallback(() => {
      const { head, mid, back } = rows;
      if (head.length !== 3 || mid.length !== 5 || back.length !== 5) return;
      const headScore = getHandScore(head);
      const midScore = getHandScore(mid);
      const backScore = getHandScore(back);
      setHandScores({ head: headScore.score, mid: midScore.score, back: backScore.score });
      setIsHandValid(headScore.rank <= midScore.rank && midScore.rank <= backScore.rank);
  }, [rows]);

  useEffect(() => { validateAndScoreHand(); }, [rows, validateAndScoreHand]);

  useEffect(() => {
    let interval;
    if (gameState === 'waiting_for_others' && gameData) {
      const poll = async () => {
        try {
          const res = await api.get(`/get_round_status.php?game_id=${gameData.game_id}&round=${gameData.round}`);
          setPlayerStatuses(res.data.player_statuses);
          if (res.data.all_submitted) {
            setGameState('SHOWING_RESULTS');
            const resultsRes = await api.get(`/get_game_results.php?game_id=${gameData.game_id}&round=${gameData.round}`);
            setResults(resultsRes.data);
            clearInterval(interval);
          }
        } catch (e) { console.error("Polling error", e); }
      };
      poll(); // Initial poll
      interval = setInterval(poll, 3000); // Poll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [gameState, gameData]);

  const handleCardClick = (card) => {
    setSelectedCards(prev => prev.includes(card) ? prev.filter(c => c !== card) : [...prev, card]);
  };

  const handleRowClick = (targetRowName) => {
    if (selectedCards.length === 0) return;

    const newRows = JSON.parse(JSON.stringify(rows));
    let cardsToMove = [...selectedCards];
    
    // Remove cards from their original rows
    Object.keys(newRows).forEach(rowName => {
        newRows[rowName] = newRows[rowName].filter(card => !cardsToMove.includes(card));
    });

    // Add cards to the target row, respecting size limits
    const targetLimit = targetRowName === 'head' ? 3 : 5;
    let overflow = [];
    while (cardsToMove.length > 0) {
        if (newRows[targetRowName].length < targetLimit) {
            newRows[targetRowName].push(cardsToMove.shift());
        } else {
            overflow.push(cardsToMove.shift());
        }
    }

    // Distribute overflow cards to other rows
    const otherRowNames = ['head', 'mid', 'back'].filter(r => r !== targetRowName);
    otherRowNames.forEach(rowName => {
        const limit = rowName === 'head' ? 3 : 5;
        while (overflow.length > 0 && newRows[rowName].length < limit) {
            newRows[rowName].push(overflow.shift());
        }
    });

    setRows(newRows);
    setSelectedCards([]);
  };

  const submitHand = async () => {
    if (!isHandValid) {
      alert('牌型不符合规则（头道 < 中道 < 尾道），请调整后再提交。');
      return;
    }
    try {
      const finalHand = [...rows.head, ...rows.mid, ...rows.back];
      await api.post('/submit_manual_hand.php', { sorted_hand: finalHand });
      setGameState('waiting_for_others');
    } catch (e) { alert(e.response?.data?.message || '提交失败'); }
  };
  
  const nextRound = () => {
    setGameState('LOADING');
    setResults(null);
    setPlayerStatuses([]);
    setSelectedCards([]);
    checkGameState();
  }
  
  // --- Render logic based on gameState ---

  if (gameState === 'LOADING') return <div className="min-h-screen bg-gradient-to-b from-[#064e3b] to-[#022c22] flex justify-center items-center"><p className="text-white animate-pulse">正在进入牌局...</p></div>;
  if (gameState === 'NO_GAME') return <div className="min-h-screen bg-gradient-to-b from-[#064e3b] to-[#022c22] flex flex-col justify-center items-center text-white"><p className="mb-4 text-center max-w-xs">{error}</p><button onClick={() => navigate('/dashboard')} className="bg-yellow-600 text-black px-6 py-2 rounded-full font-bold">返回首页</button></div>;
  if (gameState === 'GAME_OVER') return <div className="min-h-screen bg-gradient-to-b from-[#064e3b] to-[#022c22] flex flex-col justify-center items-center text-white"><p className="mb-4">所有10轮比赛都已完成。</p><button onClick={() => navigate('/dashboard')} className="bg-yellow-600 text-black px-6 py-2 rounded-full font-bold">查看最终积分榜</button></div>;
  if (gameState === 'SHOWING_RESULTS') return <ResultsDisplay results={results} onNextRound={nextRound} playerShortId={playerShortId} />;
  if (gameState === 'waiting_for_others') return <WaitingRoom players={playerStatuses} />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#064e3b] to-[#022c22] text-white overflow-hidden flex flex-col">
      <div className="p-4 flex justify-between items-center bg-black/20">
        <button onClick={() => navigate('/dashboard')} className="text-sm opacity-60 hover:opacity-100">返回</button>
        <h1 className="text-lg font-bold text-yellow-500 tracking-widest">Round {gameData?.round}</h1>
        <div/>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center px-2 space-y-4">
        <GameRow title="头道" cards={rows.head} selected={selectedCards} onCardClick={handleCardClick} onRowClick={() => handleRowClick('head')} isValid={isHandValid} score={handScores.head} />
        <GameRow title="中道" cards={rows.mid} selected={selectedCards} onCardClick={handleCardClick} onRowClick={() => handleRowClick('mid')} isValid={isHandValid} score={handScores.mid} />
        <GameRow title="尾道" cards={rows.back} selected={selectedCards} onCardClick={handleCardClick} onRowClick={() => handleRowClick('back')} isValid={isHandValid} score={handScores.back} />
      </div>

      <div className="p-6 bg-gradient-to-t from-black/60 to-transparent">
        <button onClick={submitHand} disabled={!isHandValid} className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black h-14 rounded-2xl font-black text-lg shadow-lg hover:scale-105 transition-transform disabled:bg-gray-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed disabled:shadow-none">
          {isHandValid ? '确认出牌' : '牌型不合规'}
        </button>
        <p className="text-center text-white/30 text-[10px] mt-4">提示：选择卡牌，然后点击目标牌道进行移动</p>
      </div>
    </div>
  );
}