// frontend/src/components/ComparisonModal.js
import React from 'react';
import StaticCard from './StaticCard';
// import { HAND_TYPE_NAMES } from '../logic/handEvaluator'; // 已移除

// const getTypeName = (typeNum) => HAND_TYPE_NAMES[typeNum] || '未知'; // 已移除

// 展开横向显示所有牌面（无重叠，理牌区风格）
const renderExpandedCards = (cards) => {
  // 响应式宽度 (这些值可以根据App.css中comparison-cell .static-card的最终目标大小来调整)
  let cardWidth = 60, cardHeight = 84, gap = 5; // 默认稍大一点的尺寸
  if (window.innerWidth < 600) { // 非常小的屏幕
    cardWidth = 38; cardHeight = 53; gap = 3;
  } else if (window.innerWidth < 900) { // 中等屏幕
    cardWidth = 48; cardHeight = 67; gap = 4;
  }
  // 你可以根据需要添加更多的断点

  return (
    <div
      className="mini-cards" // 这个类名在 App.css 中有样式
      style={{
        display: 'flex',
        gap: `${gap}px`,
        alignItems: 'center',
        justifyContent: 'center', // 卡牌在mini-cards容器内居中
        position: 'relative',    // 如果内部元素需要绝对定位
        height: `${cardHeight}px`, // 容器高度由卡牌高度决定
        // minHeight: `${cardHeight}px`, // 可选
      }}
    >
      {cards.map((card) => ( // 移除了未使用的 index
        <StaticCard
          key={card.id + '_static_expanded'} // 确保key的唯一性
          cardData={card}
          // 将计算出的尺寸作为 style prop 传递给 StaticCard
          style={{
            width: `${cardWidth}px`,
            height: `${cardHeight}px`,
            // position: 'relative', // StaticCard 内部的 div 已经是 relative 或 static
          }}
        />
      ))}
    </div>
  );
};


const PlayerComparisonCell = ({ player, isHuman, players }) => {
    // ... (PlayerComparisonCell 之前的逻辑保持不变) ...
    if (!player || !player.finalArrangement) { return <div className="comparison-cell empty"><span>等待数据...</span></div>; }
    const topCards = (player.cards && Array.isArray(player.cards.TOP)) ? player.cards.TOP : [];
    const middleCards = (player.cards && Array.isArray(player.cards.MIDDLE)) ? player.cards.MIDDLE : [];
    const bottomCards = (player.cards && Array.isArray(player.cards.BOTTOM)) ? player.cards.BOTTOM : [];
    const roundScore = typeof player.roundScore === 'number' ? player.roundScore : 0模态框背景色一致，这样即使 `object-fit: contain;` 留有空白，也不会看起来像边框。

4.  **`background-color: white;` 在 `.static-card` 上**:
    *   我注意到在您提供的 `App.css` 中，`.comparison-cell .static-card` 有 `background: white;`。如果SVG是透明的，并且由于 `object-fit: contain` 没有完全填满 `StaticCard` 的div，这个白色背景就会显露出来，形成类似边框的效果。
    *   **解决方案**: 将 `.comparison-cell .static-card` 的 `background` 改为 `transparent` 或与 `.comparison-cell` 的背景色协调。

鉴于您已经用了 `!important`，优先级问题可能性较小，但仍值得检查。SVG自身包含边框或 `object-fit` 导致的视觉残留是更可能的原因。

---

**文件: `frontend/src/App.css` (修改 - 完整代码)**

我将重点修改 `.comparison-cell .static-card` 和其内部 `img` 的样式，目标是消除任何可能产生边框效果的属性。

```css
/* frontend/src/App.css */

/* --- 全局与基础布局 (保持不变) --- */
/* ... (body, app-container, game-view-active, banner-section, player-status-banner-section, top-banner-container, player-banner-item, hand-lane-banner, hand-area, hand-info-internal, .card (主游戏区), controls-banner-section, controls, game-button 等样式与您上一版本提供的基本一致，此处省略以突出重点) ... */
/* 我将直接从比牌界面的样式开始，因为主游戏区的卡牌显示似乎没问题 */


/* --- 比牌视图容器 --- */
.comparison-view-container { 
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
  background-color: #073b4c; 
  display: flex; align-items: center; justify-content: center; 
  padding: 10px; /* 给模态框一些外边距 */
  z-index: 1000; 
  overflow: auto; 
}
.comparison-modal-content { 
  background-color: rgba(0, 0, 0, 0.45); 
  padding: 20px; 
  border-radius: 12px; 
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6); 
  position: relative; 
  width: 100%; 
  height: auto; 
  max-width: 95vw; 
  max-height: 95vh; 
  display: flex; 
  flex-direction: column; 
  gap: 15px; 
  overflow: hidden; 
}
.comparison-modal-content h2 { font-size: 1.3em; margin-bottom: 15px; text-align:center; color:#ffd166; margin-top:0; }
.modal-close-button, .top-right-close { position: absolute; right: 0; top: 0; border: none; background: transparent; color: #eee; font-size: 1.8em; opacity: 0.55; cursor: pointer; padding: 5px 10px; line-height: 1; z-index: 100; }
.modal-close-button:hover { opacity: 0.95; }

.comparison-grid { 
  display: grid; 
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 0 2vw; /* 列间距用vw，行间距可以固定或也用vh */
  width: 100%;
  /* height: calc(100% - 60px - 40px); */ /* 减去标题和底部按钮高度 */
  flex-grow: 1; /* 让grid占据剩余空间 */
  align-items: stretch; /* 单元格拉伸 */
  justify-items: stretch; /* 单元格拉伸 */
  overflow: hidden;
}
.comparison-cell { 
  padding: 8px; 
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: rgba(0,0,0,0.15); /* 单元格背景稍深 */
  border-radius: 6px; 
}
.comparison-cell.empty { justify-content: center; color: #555; }
.comparison-cell h4 { 
  font-size: 0.9em; 
  margin-bottom: 8px; 
  padding-bottom: 4px; 
  text-align: center;
  width:100%; 
  color:#e0e0e0; 
  border-bottom: 1px solid rgba(255,255,255,0.1); 
}
.human-player-cell h4 { color: #ffd166; }
.score-summary { font-size: 0.85em; color: #b0bec5; }

.comparison-hand-verticals { /* 您CSS中新增的，用于垂直排列三道牌 */
  display: flex;
  flex-direction: column;
  align-items: center; /* 每道牌居中 */
  width: 100%;
  gap: 5px; /* 各道之间的垂直间距 */
  flex-grow: 1; /* 占据单元格剩余空间 */
  justify-content: space-around; /* 均匀分布三道牌 */
}

.comparison-hand-row { 
  display: flex; 
  align-items: center; /* 文字和卡牌垂直居中 */
  flex-direction: row;
  margin: 0; /* 移除外边距，由父元素gap控制 */
  justify-content: flex-start; /* 文字和卡牌都靠左 */
  width: 100%;
  gap: 5px; 
}
.comparison-hand-row strong { 
  font-size: 0.8em; 
  margin-right: 8px; 
  white-space: nowrap;
  width: 2.8em; /* 给 "头道:" "中道:" "尾道:" 固定宽度 */
  text-align: right;
  opacity: 0.85;
  color: #89cff0;
}

.mini-cards {
  display: flex;
  /* gap 由JS动态设置 */
  align-items: center;
  position: relative; /* 由JS动态设置 */
  /* height 和;
    const totalScore = typeof player.score === 'number' ? player.score : 0;

    return (
        <div className={`comparison-cell ${isHuman ? 'human-player-cell' : 'ai-player-cell'}`}>
            <h4> {player.name} <span className="score-summary">(本局: {roundScore >= 0 ? '+' : ''}{roundScore} | 总: {totalScore >= 0 ? '+' : ''}{totalScore})</span> </h4>
            <div className="comparison-hand-verticals"> {/* 这个类名来自您提供的CSS */}
                <div className="comparison-hand-row"> <strong>头道:</strong> {renderExpandedCards(topCards)} </div>
                <div className="comparison-hand-row"> <strong>中道:</strong> {renderExpandedCards(middleCards)} </div>
                <div className="comparison-hand-row"> <strong>尾道:</strong> {renderExpandedCards(bottomCards)} </div>
            </div>
            {player.comparisonResults && Object.entries(player.comparisonResults).map(([opponentId, res]) => { const opponent = players.find(p=>p.id === opponentId); if (res.details && Array.isArray(res.details) && res.details.some(d => d.toLowerCase().includes("打枪")) && res.score !== 0) { return ( <p key={`${player.id}_vs_${opponentId}_shoot`} className={`shoot-info ${res.score > 0 ? 'positive-shoot' : 'negative-shoot'}`}> {res.score > 0 ? `打枪 ${opponent?.name || '对手'}!` : `被 ${opponent?.name || '对手'} 打枪!`} </p> ); } return null; })}
        </div>
    );
};

// 固定田字型顺序（2x2）：前两为上排，后两为下排
const get2x2GridOrder = (players, humanPlayerId) => { /* ... (保持不变) ... */ };
// (get2x2GridOrder 的代码与上一版本完全相同，此处省略)


const ComparisonModal = ({ onClose, players, humanPlayerId, onContinueGame }) => {
  // ... (ComparisonModal 的主体逻辑保持不变) ...
  if (!players || players.length === 0) return null;
  const gridOrder = get2x2GridOrder(players, humanPlayerId); // 确保这个函数在上面定义了

  return (
    <div className="comparison-view-container"> 
      <div className="modal-content comparison-modal-content">
        <button className="modal-close-button top-right-close" onClick={onClose}>×</button>
        <h2>本局比牌结果</h2>
        <div className="comparison-grid">
          {gridOrder.map((p, idx) =>
            p
              ? <PlayerComparisonCell key={p.id} player={p} isHuman={p.id === humanPlayerId} players={players} />
              : <div className="comparison-cell empty" key={`empty_${idx}`}><span></span></div> // 给空单元格一个key
          )}
        </div>
        <div className="modal-actions">
          <button className="game-button continue-game-button" onClick={onContinueGame}>继续游戏</button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
