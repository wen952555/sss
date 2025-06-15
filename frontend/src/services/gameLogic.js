// 生成一副牌
export const createDeck = () => {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const deck = [];
  
  suits.forEach(suit => {
    values.forEach(value => {
      deck.push({ suit, value });
    });
  });
  
  return deck;
};

// 洗牌
export const shuffleDeck = (deck) => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// 初始化游戏
export const initializeGame = (deck) => {
  const shuffledDeck = shuffleDeck(deck);
  
  const players = [
    { id: 0, name: '您', hand: [], cards: null, score: 0 },
    { id: 1, name: 'AI玩家1', hand: [], cards: null, score: 0 },
    { id: 2, name: 'AI玩家2', hand: [], cards: null, score: 0 },
    { id: 3, name: 'AI玩家3', hand: [], cards: null, score: 0 }
  ];
  
  // 发牌
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 4; j++) {
      players[j].hand.push(shuffledDeck.pop());
    }
  }
  
  return {
    players,
    deck: shuffledDeck
  };
};

// AI分牌逻辑
export const aiPlay = (hand) => {
  // 简化的AI分牌策略：按花色和数值排序
  const sortedHand = [...hand].sort((a, b) => {
    if (a.suit !== b.suit) {
      return a.suit.localeCompare(b.suit);
    }
    return a.value - b.value;
  });
  
  // 简单的分组策略
  return {
    front: sortedHand.slice(0, 3),
    middle: sortedHand.slice(3, 8),
    back: sortedHand.slice(8, 13)
  };
};

// 比较牌型并计算得分
export const calculateResults = (players) => {
  // 简化的计分逻辑
  // 实际项目中应实现完整的十三水规则
  
  const results = players.map(player => {
    // 计算每道的分数
    const frontScore = calculateGroupScore(player.cards.front);
    const middleScore = calculateGroupScore(player.cards.middle);
    const backScore = calculateGroupScore(player.cards.back);
    
    // 检查倒水情况
    const isValid = frontScore <= middleScore && middleScore <= backScore;
    
    return {
      playerId: player.id,
      frontScore,
      middleScore,
      backScore,
      totalScore: frontScore + middleScore + backScore,
      isValid
    };
  });
  
  return results;
};

const calculateGroupScore = (cards) => {
  // 简化的牌型分数计算
  // 实际项目中应实现完整的牌型识别
  
  if (cards.length === 0) return 0;
  
  // 检查同花顺
  if (isStraightFlush(cards)) return 100;
  
  // 检查铁支
  if (isFourOfAKind(cards)) return 80;
  
  // 检查葫芦
  if (isFullHouse(cards)) return 60;
  
  // 检查同花
  if (isFlush(cards)) return 40;
  
  // 检查顺子
  if (isStraight(cards)) return 20;
  
  // 其他情况按高牌计算
  return cards.reduce((sum, card) => sum + Math.min(card.value, 10), 0);
};

// 以下为简化的牌型判断函数
const isStraightFlush = (cards) => {
  return isFlush(cards) && isStraight(cards);
};

const isFourOfAKind = (cards) => {
  const values = cards.map(c => c.value);
  const valueCounts = {};
  
  values.forEach(val => {
    valueCounts[val] = (valueCounts[val] || 0) + 1;
  });
  
  return Object.values(valueCounts).some(count => count >= 4);
};

const isFullHouse = (cards) => {
  if (cards.length < 5) return false;
  
  const values = cards.map(c => c.value);
  const valueCounts = {};
  
  values.forEach(val => {
    valueCounts[val] = (valueCounts[val] || 0) + 1;
  });
  
  const counts = Object.values(valueCounts).sort((a, b) => b - a);
  return counts[0] >= 3 && counts[1] >= 2;
};

const isFlush = (cards) => {
  const suit = cards[0].suit;
  return cards.every(card => card.suit === suit);
};

const isStraight = (cards) => {
  const values = cards.map(c => c.value).sort((a, b) => a - b);
  
  // 检查A作为1的特殊情况
  if (values.includes(1) && values.includes(13)) {
    values[values.indexOf(1)] = 14;
    values.sort((a, b) => a - b);
  }
  
  for (let i = 1; i < values.length; i++) {
    if (values[i] - values[i - 1] !== 1) {
      return false;
    }
  }
  
  return true;
};
