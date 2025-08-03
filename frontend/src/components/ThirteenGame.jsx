import React, { useState, useEffect } from 'react';
import { sortCards } from './Card'; // 确保 sortCards 被导出和导入
import Lane from './Lane';

const ThirteenGame = ({ playerHand, onBackToLobby }) => { // 增加一个返回大厅的函数
  // 不再需要 unassignedCards, selectedCards
  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);

  useEffect(() => {
    // 当接收到新的手牌时，自动分配
    if (playerHand && playerHand.length === 13) {
      autoArrangeCards(playerHand);
    }
  }, [playerHand]);

  /**
   * 自动理牌函数
   * @param {Array} hand - 13张牌的数组
   */
  const autoArrangeCards = (hand) => {
    // 1. 先将所有手牌从大到小排序
    const sortedHand = sortCards(hand).reverse(); // reverse() 使得最大的牌在最前面

    // 2. 分配尾墩 (最大的5张)
    const bottom = sortedHand.slice(0, 5);
    setBottomLane(sortCards(bottom)); // 在墩内再次正向排序，方便查看

    // 3. 分配中墩 (接下来的5张)
    const middle = sortedHand.slice(5, 10);
    setMiddleLane(sortCards(middle));

    // 4. 分配头墩 (最后的3张)
    const top = sortedHand.slice(10, 13);
    setTopLane(sortCards(top));
  };
  
  const handleConfirm = () => {
      // 这里的比牌逻辑变得非常重要
      // 后续会在这里实现比较 top, middle, bottom 三墩牌力
      alert("牌已确认！后续将添加比牌逻辑。");
  }

  return (
    <div className="thirteen-game">
      <h2>十三张游戏 - 自动理牌结果</h2>

      <div className="lanes-area">
        <Lane 
          title="头墩"
          cards={topLane}
          expectedCount={3}
        />
        <Lane 
          title="中墩" 
          cards={middleLane}
          expectedCount={5}
        />
        <Lane 
          title="尾墩" 
          cards={bottomLane}
          expectedCount={5}
        />
      </div>

      <div className="game-actions">
        {/* 重新发牌/返回大厅的按钮 */}
        <button onClick={onBackToLobby} className="reset">
          返回大厅
        </button>
        <button onClick={handleConfirm}>
          确认牌型
        </button>
      </div>
      
      {/* 
        由于是自动理牌，手动操作的UI（如手牌区、重置按钮）可以暂时移除
        或保留下来用于后续的“手动微调”功能。
        为了满足当前需求，我们先将其简化。
      */}
    </div>
  );
};

export default ThirteenGame;
