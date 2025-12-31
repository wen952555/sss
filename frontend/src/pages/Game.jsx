import { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { getHandDetails } from '../utils/pokerLogic';

export default function Game() {
  const [rows, setRows] = useState({ head: [], mid: [], back: [] });
  const [selected, setSelected] = useState([]);
  const [gameState, setGameState] = useState('betting'); // betting, playing, comparing, result
  const [oppRows, setOppRows] = useState({ head: [], mid: [], back: [] }); // 模拟对手
  const [results, setResults] = useState(null);
  const navigate = useNavigate();

  // 1. 发牌与基础理牌
  const dealGame = async () => {
    const res = await api.get('/game_deal.php');
    const cards = res.data.hand;
    // 基础理牌算法：按点数从大到小排列，确保初始状态不倒水
    const sorted = [...cards].sort((a, b) => {
      const rankOrder = { '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, '10':10, 'jack':11, 'queen':12, 'king':13, 'ace':14 };
      return rankOrder[b.split('_')[0]] - rankOrder[a.split('_')[0]];
    });
    setRows({ back: sorted.slice(0, 5), mid: sorted.slice(5, 10), head: sorted.slice(10, 13) });
    setGameState('playing');
    setResults(null);
  };

  // 2. 交换逻辑
  const swapRows = (targetRow) => {
    if (selected.length === 0 || selected.every(s => s.row === targetRow)) return;
    const newRows = JSON.parse(JSON.stringify(rows));
    selected.forEach((s, i) => {
      const targetIdx = i % newRows[targetRow].length;
      const temp = newRows[targetRow][targetIdx];
      newRows[targetRow][targetIdx] = newRows[s.row][s.index];
      newRows[s.row][s.index] = temp;
    });
    setRows(newRows);
    setSelected([]);
  };

  // 3. 提交牌型并比牌
  const submitHand = () => {
    const h = getHandDetails(rows.head);
    const m = getHandDetails(rows.mid);
    const b = getHandDetails(rows.back);

    // 检查倒水 (尾道必须 >= 中道 >= 头道)
    if (h.score > m.score || m.score > b.score) {
      alert("牌型违规：必须 尾道 ≥ 中道 ≥ 头道 (倒水)");
      return;
    }

    setGameState('comparing');
    // 模拟对手牌型 (实际开发中应从后端获取)
    setOppRows({
        head: ["2_of_clubs", "3_of_diamonds", "5_of_hearts"],
        mid: ["jack_of_spades", "jack_of_clubs", "4_of_hearts", "4_of_clubs", "9_of_diamonds"],
        back: ["ace_of_hearts", "ace_of_spades", "ace_of_clubs", "8_of_hearts", "8_of_diamonds"]
    });

    setTimeout(() => {
        const oppH = getHandDetails(["2_of_clubs", "3_of_diamonds", "5_of_hearts"]);
        const oppM = getHandDetails(["jack_of_spades", "jack_of_clubs", "4_of_hearts", "4_of_clubs", "9_of_diamonds"]);
        const oppB = getHandDetails(["ace_of_hearts", "ace_of_spades", "ace_of_clubs", "8_of_hearts", "8_of_diamonds"]);
        
        const winH = h.score > oppH.score ? 1 : -1;
        const winM = m.score > oppM.score ? 1 : -1;
        const winB = b.score > oppB.score ? 1 : -1;
        
        setResults({ head: winH, mid: winM, back: winB, total: winH + winM + winB });
        setGameState('result');
    }, 2000);
  };

  const Card = ({ card, row, index }) => (
    <div 
      onClick={(e) => { e.stopPropagation(); if(gameState==='playing') {
        const isSel = selected.find(s => s.row === row && s.index === index);
        if(isSel) setSelected(selected.filter(s => !(s.row===row && s.index===index)));
        else setSelected([...selected, {row, index}]);
      }}}
      className={`relative transition-all duration-200 ${selected.find(s => s.row===row && s.index===index) ? 'ring-4 ring-yellow-400 rounded-lg scale-105 z-30' : 'hover:-translate-y-2'}`}
    >
      <img src={`/cards/${card}.svg`} className="w-20 h-28 md:w-24 md:h-32 shadow-xl" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#022c22] text-white p-4 font-sans">
      {/* 顶部状态 */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-6">
        <button onClick={() => navigate('/dashboard')} className="bg-white/10 px-4 py-2 rounded-full text-sm">返回大厅</button>
        <h2 className="text-xl font-black text-yellow-500 tracking-[0.5em]">皇家十三水</h2>
        <div className="w-20"></div>
      </div>

      {gameState === 'comparing' || gameState === 'result' ? (
        /* 比牌对决界面 */
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
          {['head', 'mid', 'back'].map(r => (
            <div key={r} className="flex justify-between items-center gap-4">
              <div className="flex -space-x-10 opacity-50">
                {oppRows[r].map((c, i) => <img key={i} src={`/cards/${c}.svg`} className="w-16 h-24" />)}
              </div>
              <div className="text-2xl font-black italic text-yellow-500">VS</div>
              <div className="flex -space-x-10">
                {rows[r].map((c, i) => <img key={i} src={`/cards/${c}.svg`} className="w-20 h-28" />)}
              </div>
              {results && (
                <div className={`text-2xl font-bold ${results[r] > 0 ? 'text-green-400' : 'text-red-500'}`}>
                  {results[r] > 0 ? '胜' : '负'}
                </div>
              )}
            </div>
          ))}
          {gameState === 'result' && (
            <div className="text-center p-6 bg-black/40 rounded-3xl border-2 border-yellow-500">
                <h3 className="text-4xl font-black mb-4">{results.total > 0 ? '恭喜获胜！' : '遗憾落败'}</h3>
                <button onClick={dealGame} className="bg-yellow-500 text-black px-10 py-3 rounded-full font-bold">再来一局</button>
            </div>
          )}
        </div>
      ) : (
        /* 理牌操作界面 */
        <div className="max-w-2xl mx-auto space-y-6">
          {['head', 'mid', 'back'].map((r) => (
            <div 
              key={r} onClick={() => swapRows(r)}
              className="relative p-6 bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="absolute top-2 left-4 text-[10px] text-yellow-500 font-bold uppercase">
                {r === 'head' ? '头道' : r === 'mid' ? '中道' : '尾道'} - {getHandDetails(rows[r]).name}
              </div>
              <div className="flex -space-x-8 md:-space-x-12 mt-2">
                {rows[r].map((c, i) => <Card key={i} card={c} row={r} index={i} />)}
              </div>
            </div>
          ))}

          <div className="flex gap-4 pt-6">
            <button onClick={dealGame} className="flex-1 h-14 bg-white/10 rounded-2xl font-bold">重新发牌</button>
            <button onClick={submitHand} className="flex-1 h-14 bg-yellow-600 rounded-2xl font-black text-black text-lg shadow-[0_0_20px_rgba(202,138,4,0.4)]">确认出牌</button>
          </div>
          <p className="text-center text-white/30 text-xs">点击牌多选，点击另一道区域进行整组交换位置</p>
        </div>
      )}
    </div>
  );
}