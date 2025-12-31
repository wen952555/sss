import { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { smartSort, getPatternName } from '../utils/pokerLogic';

export default function Game() {
  const [rows, setRows] = useState({ head: [], mid: [], back: [] });
  const [selected, setSelected] = useState([]); // [{row, index}]
  const [isComparing, setIsComparing] = useState(false);
  const navigate = useNavigate();

  const handleDeal = async () => {
    try {
      const res = await api.get('/game_deal.php');
      // 使用更强的智能理牌模块
      const arranged = smartSort(res.data.hand);
      setRows(arranged);
      setSelected([]);
      setIsComparing(false);
    } catch (e) { navigate('/login'); }
  };

  useEffect(() => { handleDeal(); }, []);

  // 选择逻辑优化：防止闪烁
  const toggleCard = (row, index) => {
    const isSelected = selected.find(s => s.row === row && s.index === index);
    if (isSelected) {
      setSelected(selected.filter(s => !(s.row === row && s.index === index)));
    } else {
      setSelected([...selected, { row, index }]);
    }
  };

  // 交换逻辑
  const moveCards = (targetRow) => {
    if (selected.length === 0 || selected.every(s => s.row === targetRow)) {
      setSelected([]);
      return;
    }

    const newRows = { ...rows };
    selected.forEach((s, i) => {
      const targetIdx = i % newRows[targetRow].length;
      const temp = newRows[targetRow][targetIdx];
      newRows[targetRow][targetIdx] = newRows[s.row][s.index];
      newRows[s.row][s.index] = temp;
    });

    setRows(newRows);
    setSelected([]);
  };

  const Card = ({ card, row, index }) => {
    const isSel = selected.some(s => s.row === row && s.index === index);
    return (
      <div 
        onClick={(e) => { e.stopPropagation(); toggleCard(row, index); }}
        className={`relative transition-all duration-200 transform ${
          isSel ? 'ring-2 ring-yellow-400 z-30 scale-105 shadow-2xl' : 'z-10'
        }`}
      >
        <img 
          src={`/cards/${card}.svg`} 
          className="w-[18vw] max-w-[80px] h-auto rounded-md shadow-lg pointer-events-none" 
          alt={card} 
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#064e3b] text-white overflow-hidden flex flex-col">
      {/* 顶部菜单 */}
      <div className="p-4 flex justify-between items-center bg-black/20">
        <button onClick={() => navigate('/dashboard')} className="text-sm opacity-60">返回</button>
        <h1 className="text-lg font-bold text-yellow-500 tracking-widest">皇家十三水</h1>
        <button onClick={handleDeal} className="bg-yellow-600 text-black px-4 py-1 rounded-full text-xs font-bold">发牌</button>
      </div>

      {/* 游戏主体 - 针对手机屏幕高度优化 */}
      <div className="flex-1 flex flex-col justify-center items-center px-2 space-y-4">
        {['head', 'mid', 'back'].map((r) => (
          <div 
            key={r}
            onClick={() => moveCards(r)}
            className={`w-full max-w-md p-4 rounded-2xl border-2 transition-colors ${
              selected.length > 0 && !selected.every(s => s.row === r) 
                ? 'border-yellow-500/50 bg-white/10' 
                : 'border-white/5 bg-black/20'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-white/40 uppercase">
                {r === 'head' ? '头道' : r === 'mid' ? '中道' : '尾道'}
              </span>
              <span className="text-[10px] text-yellow-500 font-bold">{getPatternName(rows[r])}</span>
            </div>
            
            <div className="flex justify-center -space-x-8 md:-space-x-10">
              {rows[r].map((c, i) => (
                <Card key={`${c}-${r}-${i}`} card={c} row={r} index={i} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 底部操作区 */}
      <div className="p-6 bg-gradient-to-t from-black/60 to-transparent">
        <button 
          onClick={() => setIsComparing(true)}
          className="w-full bg-yellow-500 text-black h-14 rounded-2xl font-black text-lg shadow-2xl active:scale-95 transition-transform"
        >
          确认出牌 (比牌)
        </button>
        <p className="text-center text-white/30 text-[10px] mt-4">
          提示：点击扑克牌多选，点击目标道进行位置互换
        </p>
      </div>

      {/* 比牌蒙层 */}
      {isComparing && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <h2 className="text-4xl font-black italic text-yellow-500 mb-10 animate-bounce">SHOWDOWN!</h2>
          <div className="space-y-6 w-full max-w-xs text-center">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span>头道: {getPatternName(rows.head)}</span>
              <span className="text-green-400">+1</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span>中道: {getPatternName(rows.mid)}</span>
              <span className="text-green-400">+1</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span>尾道: {getPatternName(rows.back)}</span>
              <span className="text-red-400">-1</span>
            </div>
            <button 
              onClick={() => { setIsComparing(false); handleDeal(); }}
              className="mt-10 bg-white text-black px-10 py-3 rounded-full font-bold"
            >
              继续游戏
            </button>
          </div>
        </div>
      )}
    </div>
  );
}