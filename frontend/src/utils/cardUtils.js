// 验证牌型是否合法 - 增强版本
export const validateCardArrangement = (head, middle, tail) => {
  // 检查数量
  if (head.length !== 3 || middle.length !== 5 || tail.length !== 5) {
    return false;
  }
  
  // 这里可以添加更复杂的牌型大小验证
  // 实际应该比较头道 ≤ 中道 ≤ 尾道
  
  // 基础验证通过
  return true;
};

// 其他工具函数保持不变...
export const parseCardFromFilename = (filename) => {
  const match = filename.match(/(.+)_of_(.+)\.svg/);
  if (!match) return null;
  
  const [, value, suit] = match;
  
  // 花色映射
  const SUIT_MAP = {
    'clubs': '♣',
    'spades': '♠', 
    'diamonds': '♦',
    'hearts': '♥'
  };

  // 点数映射
  const VALUE_MAP = {
    'ace': 'A',
    'king': 'K',
    'queen': 'Q',
    'jack': 'J',
    '10': '10',
    '9': '9',
    '8': '8',
    '7': '7',
    '6': '6',
    '5': '5',
    '4': '4',
    '3': '3',
    '2': '2'
  };

  return {
    value,
    suit,
    display: `${VALUE_MAP[value] || value}${SUIT_MAP[suit] || suit}`,
    filename,
    sortValue: getSortValue(value, suit)
  };
}

// 获取排序值
const getSortValue = (value, suit) => {
  const valueOrder = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
  };
  const suitOrder = {
    'clubs': 0, 'diamonds': 1, 'hearts': 2, 'spades': 3
  };
  
  return valueOrder[value] * 10 + suitOrder[suit];
}

// 洗牌算法
export const shuffleCards = (cards) => {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 生成52张标准扑克牌
export const generateDeck = () => {
  const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
  
  const deck = [];
  suits.forEach(suit => {
    values.forEach(value => {
      const filename = `${value}_of_${suit}.svg`;
      deck.push(parseCardFromFilename(filename));
    });
  });
  
  return deck;
}
