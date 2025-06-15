// 增强的 AI 分牌逻辑
export const aiPlay = (hand) => {
  // 按花色和数值排序
  const sortedHand = [...hand].sort((a, b) => {
    const suitOrder = { 'spades': 4, 'hearts': 3, 'clubs': 2, 'diamonds': 1 };
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[b.suit] - suitOrder[a.suit];
    }
    return b.value - a.value;
  });

  // 尝试找出同花顺
  const findStraightFlush = () => {
    // 实现同花顺检测逻辑
    // 简化的实现：返回最后13张牌
    return {
      back: sortedHand.slice(0, 5),
      middle: sortedHand.slice(5, 10),
      front: sortedHand.slice(10, 13)
    };
  };

  // 尝试找出铁支（四张相同）
  const findFourOfAKind = () => {
    const valueMap = {};
    sortedHand.forEach(card => {
      valueMap[card.value] = (valueMap[card.value] || 0) + 1;
    });
    
    const fourOfAKindValue = Object.keys(valueMap).find(val => valueMap[val] === 4);
    
    if (fourOfAKindValue) {
      const fourCards = sortedHand.filter(card => card.value == fourOfAKindValue);
      const otherCards = sortedHand.filter(card => card.value != fourOfAKindValue);
      
      return {
        back: [...fourCards, otherCards[0]].slice(0, 5),
        middle: otherCards.slice(1, 6),
        front: otherCards.slice(6, 9)
      };
    }
    return null;
  };

  // 高级分牌策略
  const advancedStrategy = () => {
    // 优先分配尾道（5张最大牌）
    const back = sortedHand.slice(0, 5);
    
    // 然后分配中道（5张次大牌）
    const middle = sortedHand.slice(5, 10);
    
    // 最后分配头道（3张最小牌）
    const front = sortedHand.slice(10, 13);
    
    return { front, middle, back };
  };

  // 尝试使用不同策略
  return findFourOfAKind() || findStraightFlush() || advancedStrategy();
};
