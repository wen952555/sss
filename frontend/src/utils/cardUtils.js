// 扑克牌配置
export const CARD_CONFIG = {
  suits: {
    'S': { name: 'spades', color: 'black', symbol: '♠' },
    'H': { name: 'hearts', color: 'red', symbol: '♥' },
    'D': { name: 'diamonds', color: 'red', symbol: '♦' },
    'C': { name: 'clubs', color: 'black', symbol: '♣' }
  },
  
  ranks: {
    '2': { name: 'two', value: 2 },
    '3': { name: 'three', value: 3 },
    '4': { name: 'four', value: 4 },
    '5': { name: 'five', value: 5 },
    '6': { name: 'six', value: 6 },
    '7': { name: 'seven', value: 7 },
    '8': { name: 'eight', value: 8 },
    '9': { name: 'nine', value: 9 },
    '10': { name: 'ten', value: 10 },
    'J': { name: 'jack', value: 11 },
    'Q': { name: 'queen', value: 12 },
    'K': { name: 'king', value: 13 },
    'A': { name: 'ace', value: 14 }
  },
  
  jokers: {
    'RJ': { name: 'red_joker', value: 53, symbol: '大王' },
    'BJ': { name: 'black_joker', value: 52, symbol: '小王' }
  }
};

// 根据牌代码获取图片路径
export const getCardImage = (cardCode) => {
  if (!cardCode) return '/images/cards/card_back.svg';
  
  if (cardCode === 'RJ' || cardCode === 'BJ') {
    return `/images/cards/${CARD_CONFIG.jokers[cardCode].name}.svg`;
  }
  
  if (cardCode.length === 2) {
    const suit = cardCode[0];
    const rank = cardCode[1];
    
    if (!CARD_CONFIG.suits[suit] || !CARD_CONFIG.ranks[rank]) {
      return '/images/cards/card_back.svg';
    }
    
    const suitName = CARD_CONFIG.suits[suit].name;
    const rankName = CARD_CONFIG.ranks[rank].name;
    
    return `/images/cards/${rankName}_of_${suitName}.svg`;
  }
  
  if (cardCode.length === 3 && cardCode[1] === '0') {
    const suit = cardCode[0];
    const rank = '10';
    
    if (!CARD_CONFIG.suits[suit] || !CARD_CONFIG.ranks[rank]) {
      return '/images/cards/card_back.svg';
    }
    
    const suitName = CARD_CONFIG.suits[suit].name;
    
    return `/images/cards/ten_of_${suitName}.svg`;
  }
  
  return '/images/cards/card_back.svg';
};

// 获取牌显示文本
export const getCardText = (cardCode) => {
  if (!cardCode) return '';
  
  if (cardCode === 'RJ') return '大王';
  if (cardCode === 'BJ') return '小王';
  
  if (cardCode.length === 2) {
    const suit = CARD_CONFIG.suits[cardCode[0]]?.symbol || '';
    const rank = cardCode[1];
    return `${rank}${suit}`;
  }
  
  if (cardCode.length === 3 && cardCode[1] === '0') {
    const suit = CARD_CONFIG.suits[cardCode[0]]?.symbol || '';
    return `10${suit}`;
  }
  
  return '';
};

// 获取牌颜色类名
export const getCardColorClass = (cardCode) => {
  if (!cardCode) return 'text-gray-800';
  
  if (cardCode === 'RJ') return 'text-red-600';
  if (cardCode === 'BJ') return 'text-black';
  
  if (cardCode.length >= 2) {
    const suit = cardCode[0];
    const suitConfig = CARD_CONFIG.suits[suit];
    
    if (!suitConfig) return 'text-gray-800';
    
    return suitConfig.color === 'red' ? 'text-red-600' : 'text-black';
  }
  
  return 'text-gray-800';
};

// 生成一副新牌
export const generateDeck = () => {
  const suits = ['S', 'H', 'D', 'C'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];
  
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push(rank === '10' ? `${suit}10` : `${suit}${rank}`);
    });
  });
  
  // 添加大小王
  deck.push('RJ', 'BJ');
  
  return deck;
};

// 洗牌
export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// 发牌（十三水）
export const dealCards = (playerCount = 4) => {
  if (playerCount < 2 || playerCount > 4) {
    throw new Error('玩家数量必须在2-4人之间');
  }
  
  const deck = shuffleDeck(generateDeck());
  const cardsPerPlayer = 13;
  const hands = [];
  
  for (let i = 0; i < playerCount; i++) {
    hands.push(deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer));
  }
  
  return hands;
};

// 对牌进行排序（从大到小）
export const sortCards = (cards, descending = true) => {
  const getCardValue = (cardCode) => {
    if (cardCode === 'RJ') return 53;
    if (cardCode === 'BJ') return 52;
    
    let rank;
    if (cardCode.length === 2) {
      rank = cardCode[1];
    } else if (cardCode.length === 3) {
      rank = '10';
    } else {
      return 0;
    }
    
    return CARD_CONFIG.ranks[rank]?.value || 0;
  };
  
  return [...cards].sort((a, b) => {
    const valueA = getCardValue(a);
    const valueB = getCardValue(b);
    
    if (descending) {
      return valueB - valueA;
    } else {
      return valueA - valueB;
    }
  });
};

// 检查牌型（十三水）- 简化版
export const checkCardPattern = (cards) => {
  if (cards.length !== 13) {
    return { type: 'invalid', name: '无效牌型', score: 0 };
  }
  
  const sorted = sortCards(cards);
  
  // 这里实现简化的牌型检查
  let score = 0;
  
  cards.forEach(card => {
    if (card === 'RJ' || card === 'BJ') {
      score += 5;
    } else {
      const rank = card.length === 2 ? card[1] : '10';
      const rankValue = CARD_CONFIG.ranks[rank]?.value || 0;
      score += Math.min(rankValue, 10);
    }
  });
  
  return {
    type: 'normal',
    name: '普通牌型',
    score: score
  };
};

// 验证牌代码是否有效
export const isValidCard = (cardCode) => {
  if (cardCode === 'RJ' || cardCode === 'BJ') return true;
  
  if (cardCode.length === 2) {
    const suit = cardCode[0];
    const rank = cardCode[1];
    return CARD_CONFIG.suits[suit] && CARD_CONFIG.ranks[rank];
  }
  
  if (cardCode.length === 3 && cardCode[1] === '0') {
    const suit = cardCode[0];
    const rank = '10';
    return CARD_CONFIG.suits[suit] && CARD_CONFIG.ranks[rank];
  }
  
  return false;
};

// 获取所有牌列表
export const getAllCards = () => {
  return generateDeck();
};