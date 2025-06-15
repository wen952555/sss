// 增强的AI分牌逻辑
export const aiPlay = (hand) => {
  // 按花色和数值排序
  const sortedHand = [...hand].sort((a, b) => {
    if (a.suit !== b.suit) {
      return a.suit.localeCompare(b.suit);
    }
    return a.value - b.value;
  });
  
  // 尝试找到最佳分牌方案
  const combinations = generateCombinations(sortedHand);
  
  // 选择得分最高的组合
  let bestScore = -Infinity;
  let bestCombination = null;
  
  combinations.forEach(comb => {
    const score = evaluateCombination(comb);
    if (score > bestScore) {
      bestScore = score;
      bestCombination = comb;
    }
  });
  
  return bestCombination || {
    front: sortedHand.slice(0, 3),
    middle: sortedHand.slice(3, 8),
    back: sortedHand.slice(8, 13)
  };
};

// 生成所有可能的分牌组合
const generateCombinations = (hand) => {
  const combinations = [];
  
  // 简化版：只考虑部分组合
  for (let frontSize = 3; frontSize <= 3; frontSize++) {
    for (let middleSize = 5; middleSize <= 5; middleSize++) {
      const backSize = 13 - frontSize - middleSize;
      if (backSize !== 5) continue;
      
      // 生成组合...
      // 实际实现中应使用递归或迭代生成所有可能组合
      // 这里为简化，只返回一个默认组合
      combinations.push({
        front: hand.slice(0, frontSize),
        middle: hand.slice(frontSize, frontSize + middleSize),
        back: hand.slice(frontSize + middleSize)
      });
    }
  }
  
  return combinations;
};

// 评估组合得分
const evaluateCombination = (combination) => {
  const frontScore = calculateGroupScore(combination.front);
  const middleScore = calculateGroupScore(combination.middle);
  const backScore = calculateGroupScore(combination.back);
  
  // 确保符合规则：头道 < 中道 < 尾道
  let ruleBonus = 0;
  if (frontScore <= middleScore && middleScore <= backScore) {
    ruleBonus = 100;
  }
  
  return frontScore + middleScore + backScore + ruleBonus;
};
