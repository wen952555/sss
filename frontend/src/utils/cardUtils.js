// 扑克牌工具函数

// 花色映射
const SUIT_MAP = {
  'clubs': '♣',
  'spades': '♠', 
  'diamonds': '♦',
  'hearts': '♥'
}

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
}

// 从文件名解析扑克牌信息
export const parseCardFromFilename = (filename) => {
  const match = filename.match(/(.+)_of_(.+)\.svg/);
  if (!match) return null;
  
  const [, value, suit] = match;
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

// 判断牌型
export const getHandType = (cards) => {
  if (cards.length === 0) return '未分配';
  
  const sorted = [...cards].sort((a, b) => a.sortValue - b.sortValue);
  const values = sorted.map(card => card.value);
  const suits = sorted.map(card => card.suit);
  
  // 判断同花
  const isFlush = suits.every(suit => suit === suits[0]);
  
  // 判断顺子
  const valueOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
  const indices = values.map(value => valueOrder.indexOf(value)).sort((a, b) => a - b);
  const isStraight = indices.every((index, i, arr) => i === 0 || index === arr[i-1] + 1);
  
  if (isFlush && isStraight) {
    return indices[0] === 8 ? '皇家同花顺' : '同花顺';
  }
  
  // 计算相同点数的牌
  const valueCounts = {};
  values.forEach(value => {
    valueCounts[value] = (valueCounts[value] || 0) + 1;
  });
  
  const counts = Object.values(valueCounts).sort((a, b) => b - a);
  
  if (counts[0] === 4) return '四条';
  if (counts[0] === 3 && counts[1] === 2) return '葫芦';
  if (isFlush) return '同花';
  if (isStraight) return '顺子';
  if (counts[0] === 3) return '三条';
  if (counts[0] === 2 && counts[1] === 2) return '两对';
  if (counts[0] === 2) return '一对';
  
  return '高牌';
};

// 在autoArrangeCards函数中添加牌型判断
export const autoArrangeCards = (cards) => {
  const sortedCards = [...cards].sort((a, b) => b.sortValue - a.sortValue); // 从大到小排序
  
  // 简化的自动分牌逻辑
  // 实际十三水算法更复杂，这里做基础实现
  const head = sortedCards.slice(10, 13); // 最小的3张放头道
  const middle = sortedCards.slice(5, 10); // 中间5张放中道
  const tail = sortedCards.slice(0, 5); // 最大的5张放尾道
  
  return {
    head,
    middle, 
    tail
  };
};

// 增强验证函数
export const validateCardArrangement = (head, middle, tail) => {
  // 检查数量
  if (head.length !== 3 || middle.length !== 5 || tail.length !== 5) {
    return false;
  }
  
  // 这里可以添加更复杂的牌型大小验证
  // 实际应该比较头道 ≤ 中道 ≤ 尾道
  
  return true;
};
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
