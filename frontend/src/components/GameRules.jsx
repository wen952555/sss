import React from 'react';
import './GameRules.css';

const GameRules = ({ onBack }) => {
  return (
    <div className="rules-container">
      <button className="back-button" onClick={onBack}>
        &larr; 返回大厅
      </button>
      <h1 className="rules-title">游戏规则</h1>

      <div className="rules-section">
        <h2>基本规则</h2>
        <p>游戏使用一副或两副（8人场）扑克牌，玩家将13张手牌分为三墩：头道（3张）、中道（5张）、尾道（5张）。</p>
        <p>玩家分别比较头、中、尾三道牌，每道牌的胜负独立计算。</p>
      </div>

      <div className="rules-section">
        <h2>牌型大小 (从大到小)</h2>
        <ul className="rules-list">
          <li><strong>五条 (Five of a Kind):</strong> 5张同点数的牌 (仅8人场出现)。</li>
          <li><strong>同花顺 (Straight Flush):</strong> 5张同花色的顺子。</li>
          <li><strong>铁支 (Four of a Kind):</strong> 4张同点数的牌。</li>
          <li><strong>葫芦 (Full House):</strong> 3张同点数 + 1对。</li>
          <li><strong>同花 (Flush):</strong> 5张同花色的牌。</li>
          <li><strong>顺子 (Straight):</strong> 5张连续点数的牌。</li>
          <li><strong>三条 (Three of a Kind):</strong> 3张同点数的牌。</li>
          <li><strong>两对 (Two Pair):</strong> 2个对子。</li>
          <li><strong>对子 (Pair):</strong> 1个对子。</li>
          <li><strong>高牌 (High Card):</strong> 单张牌。</li>
        </ul>
      </div>

      <div className="rules-section">
        <h2>比牌规则</h2>
        <p><strong>倒水 (乌龙):</strong> 玩家的牌墩强度必须遵循 尾道 ≥ 中道 ≥ 头道 的规则，否则为“倒水”，将通赔所有玩家。</p>
        <p><strong>比牌:</strong> 分别比较头、中、尾三道。牌型相同则比较点数，点数再相同则为平局。同花/同花顺的比较，先比最大牌的点数，再比花色。</p>
        <p><strong>花色顺序:</strong> 黑桃 &gt; 红心 &gt; 梅花 &gt; 方块</p>
      </div>

      <div className="rules-section">
        <h2>特殊牌型</h2>
        <p>特殊牌型在开局时直接亮出，无需比牌，直接计算得分。若多个玩家有特殊牌型，则不比牌，为平局。</p>
        <ul className="rules-list">
            <li><strong>一条龙:</strong> 13张从2到A的连续牌 (13分)</li>
            <li><strong>高级三同花/三顺子:</strong> 中道或尾道为同花顺的三同花或三顺子 (8分)</li>
            <li><strong>大六对:</strong> 13张牌中包含一个铁支 (7分)</li>
            <li><strong>三同花:</strong> 头中尾三道均为同花 (4分)</li>
            <li><strong>三顺子:</strong> 头中尾三道均为顺子 (4分)</li>
            <li><strong>六对半:</strong> 13张牌中有6个对子 (3分)</li>
        </ul>
      </div>
    </div>
  );
};

export default GameRules;
