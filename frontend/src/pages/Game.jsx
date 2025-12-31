import { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function Game() {
  const [rows, setRows] = useState({ head: [], mid: [], back: [] });
  const [selected, setSelected] = useState([]); // [{row, index}]
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 1. 自动理牌核心：按权值分配，确保 Back >= Mid >= Head
  const autoArrange = (cards) => {
    const rankOrder = { '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, '10':10, 'jack':11, 'queen':12, 'king':13, 'ace':14 };
    // 简单贪心排序：将点数之和最高的放在后道
    const sorted = [...cards].sort((a, b) => rankOrder[b.split('_')[0]] - rankOrder[a.split('_')[0]]);
    return {
      back: sorted.slice(0, 5),
      mid: sorted.slice(5, 10),
      head: sorted.slice(10, 13)
    };
  };

  const dealGame = async () => {
    setLoading(true);
    try {
      const res = await api.get('/game_deal.php');
      setRows(autoArrange(res.data.hand));
      setSelected([]);
    } catch (e) { navigate('/login'); }
    finally { setLoading(false); }
  };

  // 2. 选择逻辑：多选
  const toggleSelect = (rowName, index) => {
    const key = `${rowName}-${index}`;
    const isSelected = selected.find(s => s.row === rowName && s.index === index);
    if (isSelected) {
      setSelected(selected.filter(s => !(s.row === rowName && s.index === index)));
    } else {
      setSelected([...selected, { row: rowName, index }]);
    }
  };

  // 3. 交换逻辑：点击目标行进行位置互换
  const moveSelectedTo = (targetRow) => {
    if (selected.length === 0 || selected.every(s => s.row === targetRow)) return;

    const newRows = JSON.parse(JSON.stringify(rows));
    selected.forEach((s, i) => {
      // 这里的交换逻辑：将选中的牌与目标行的前几张互换
      const temp = newRows[targetRow][i % newRows[targetRow].length];
      newRows[targetRow][i % newRows[targetRow].length] = newRows[s.row][s.index];
      newRows[s.row][s.index] = temp;
    });

    setRows(newRows);
    setSelected([]);
  };

  const Card = ({ card, row, index }) => (
    <div 
      onClick={(e) => { e.stopPropagation(); toggleSelect(row, index); }}
      className={`relative card-stack ${selected.find(s => s.row === row && s.index === index) ? 'card-selected' : ''}`}
    >
      <img src={`/cards/${card}.svg`} className="w-20 h-28 md:w-28 md:h-40 pointer-events-none" alt={card} />
    </div>
  );

  return (
    <div className="min-h-screen p-4 flex flex-col items-center">
      {/* 顶部导航 */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-10">
        <button onClick={() => navigate('/dashboard')} className="glass-panel px-6 py-2 rounded-full text-sm font-bold border border-white/20">退出房间</button>
        <h1 className="text-2xl font-black tracking-widest text-yellow-500 uppercase">Thirteen Royal</h1>
        <button onClick={dealGame} disabled={loading} className="bg-yellow-600 hover:bg-yellow-500 text-black px-8 py-2 rounded-full font-black shadow-2xl transition-all disabled:opacity-50">
          {loading ? '发牌中...' : '重新发牌'}
        </button>
      </div>

      {/* 牌局主区 */}
      <div className="w-full max-w-4xl space-y-8">
        {['head', 'mid', 'back'].map((row) => (
          <div 
            key={row}
            onClick={() => moveSelectedTo(row)}
            className="glass-panel p-4 rounded-3xl relative flex flex-col items-center group cursor-pointer hover:bg-white/10 transition-colors"
          >
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-yellow-600 uppercase tracking-widest">
              {row === 'head' ? 'Front' : row === 'mid' ? 'Middle' : 'Back'}
            </div>
            
            <div className="flex -space-x-8 md:-space-x-12">
              {rows[row].map((c, i) => <Card key={`${row}-${i}`} card={c} row={row} index={i} />)}
            </div>

            {/* 如果选中了牌，显示移入光效 */}
            {selected.length > 0 && !selected.every(s => s.row === row) && (
              <div className="absolute inset-0 border-2 border-yellow-500/30 rounded-3xl animate-pulse flex items-center justify-end pr-4">
                <span className="text-yellow-500 text-xs font-bold">点击交换至此</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-white/40 text-xs uppercase tracking-widest">操作指引: 点击扑克牌进行多选，点击其他牌墩区域执行位置交换</p>
      </div>
    </div>
  );
}