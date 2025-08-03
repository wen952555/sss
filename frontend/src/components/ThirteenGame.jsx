import React, { useState, useEffect } from 'react';
import { sortCards } from './Card'; // 导入排序函数
import Lane from './Lane';
import Hand from './Hand';

const ThirteenGame = ({ playerHand, otherPlayers }) => {
  // 初始状态：所有牌都在未分配区域
  const [unassignedCards, setUnassignedCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  
  // 三个墩的状态
  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);

  // 初始化和重置游戏
  useEffect(() => {
    // 收到新的手牌时，自动排序并设置为未分配状态
    resetGame();
  }, [playerHand]);

  const resetGame = () => {
    setUnassignedCards(sortCards(playerHand));
    setSelectedCards([]);
    setTopLane([]);
    setMiddleLane([]);
    setBottomLane([]);
  };

  // 点击手牌区的牌
  const handleCardSelect = (clickedCard) => {
    const isAlreadySelected = selectedCards.some(
      c => c.rank === clickedCard.rank && c.suit === clickedCard.suit
    );

    if (isAlreadySelected) {
      // 如果已选中，则取消选中
      setSelectedCards(selectedCards.filter(
        c => !(c.rank === clickedCard.rank && c.suit === clickedCard.suit)
      ));
    } else {
      // 如果未选中，则加入选中列表
      setSelectedCards([...selectedCards, clickedCard]);
    }
  };

  // 点击某个墩 (Lane)
  const handlePlaceCards = (laneSetter, expectedCount, currentLaneCards) => {
    if (selectedCards.length === 0) {
      alert("请先从手牌区选择要放置的牌！");
      return;
    }
    
    const totalCards = selectedCards.length + currentLaneCards.length;
    if (totalCards > expectedCount) {
      alert(`这一墩最多只能放 ${expectedCount} 张牌！`);
      return;
    }

    // 1. 将选中的牌放入目标墩
    laneSetter(sortCards([...currentLaneCards, ...selectedCards]));

    // 2. 从手牌区移除这些牌
    setUnassignedCards(unassignedCards.filter(card => 
      !selectedCards.some(sc => sc.rank === card.rank && sc.suit === card.suit)
    ));

    // 3. 清空选中列表
    setSelectedCards([]);
  };
  
  // 检查是否所有牌都已放置
  const isReady = unassignedCards.length === 0 && topLane.length === 3 && middleLane.length === 5 && bottomLane.length === 5;

  const handleConfirm = () => {
      // 在这里添加比牌逻辑
      // 简单规则校验：尾墩 > 中墩 > 头墩
      // 此处暂时只做 alert
      alert("牌已确认！后续将添加比牌逻辑。");
  }

  return (
    <div className="thirteen-game">
      <h2>十三张游戏</h2>

      {/* 墩区 */}
      <div className="lanes-area">
        <Lane 
          title="头墩"
          cards={topLane}
          expectedCount={3}
          onLaneClick={() => handlePlaceCards(setTopLane, 3, topLane)}
        />
        <Lane 
          title="中墩" 
          cards={middleLane}
          expectedCount={5}
          onLaneClick={() => handlePlaceCards(setMiddleLane, 5, middleLane)}
        />
        <Lane 
          title="尾墩" 
          cards={bottomLane}
          expectedCount={5}
          onLaneClick={() => handlePlaceCards(setBottomLane, 5, bottomLane)}
        />
      </div>

      {/* 控制按钮 */}
      <div className="game-actions">
        <button onClick={() => setUnassignedCards(sortCards(unassignedCards))}>
          手牌排序
        </button>
        <button onClick={resetGame} className="reset">
          重置
        </button>
        <button onClick={handleConfirm} disabled={!isReady}>
          确认出牌
        </button>
      </div>

      {/* 手牌区 */}
      <Hand 
        cards={unassignedCards}
        selectedCards={selectedCards}
        onCardClick={handleCardSelect}
      />
    </div>
  );
};

export default ThirteenGame;
