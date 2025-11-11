// 游戏逻辑和牌型判断

// 牌型常量
export const HAND_TYPES = {
  HIGH_CARD: '高牌',
  PAIR: '对子',
  TWO_PAIR: '两对',
  THREE_OF_A_KIND: '三条',
  STRAIGHT: '顺子',
  FLUSH: '同花',
  FULL_HOUSE: '葫芦',
  FOUR_OF_A_KIND: '四条',
  STRAIGHT_FLUSH: '同花顺',
  ROYAL_FLUSH: '皇家同花顺'
};

// 牌力值（用于比较）
export const HAND_RANKS = {
  [HAND_TYPES.HIGH_CARD]: 1,
  [HAND_TYPES.PAIR]: 2,
  [HAND_TYPES.TWO_PAIR]: 3,
  [HAND_TYPES.THREE_OF_A_KIND]: 4,
  [HAND_TYPES.STRAIGHT]: 5,
  [HAND_TYPES.FLUSH]: 6,
  [HAND_TYPES.FULL_HOUSE]: 7,
  [HAND_TYPES.FOUR_OF_A_KIND]: 8,
  [HAND_TYPES.STRAIGHT_FLUSH]: 9,
  [HAND_TYPES.ROYAL_FLUSH]: 10
};

// 解析牌代码
export function parseCard(cardCode) {
  if (!cardCode || cardCode.length < 2) return null;
  
  const suit = cardCode.charAt(0).toLowerCase();
  const rank = parseInt(cardCode.substring(1));
  
  return { suit, rank };
}

// 获取牌的花色名称
export function getSuitName(suit) {
  const suitNames = {
    's': '黑桃',
    'h': '红心',
    'c': '梅花',
    'd': '方块'
  };
  return suitNames[suit] || '未知';
}

// 获取牌的点数名称
export function getRankName(rank) {
  const rankNames = {
    1: 'A',
    11: 'J',
    12: 'Q',
    13: 'K'
  };
  return rankNames[rank] || rank.toString();
}

// 判断牌型
export function evaluateHand(cards) {
  if (!cards || cards.length === 0) return { type: HAND_TYPES.HIGH_CARD, rank: 0 };
  
  const parsedCards = cards.map(parseCard).filter(Boolean);
  
  // 按点数排序
  parsedCards.sort((a, b) => b.rank - a.rank);
  
  // 检查同花
  const isFlush = checkFlush(parsedCards);
  
  // 检查顺子
  const isStraight = checkStraight(parsedCards);
  
  // 皇家同花顺
  if (isFlush && isStraight && parsedCards[0].rank === 13) {
    return { type: HAND_TYPES.ROYAL_FLUSH, rank: HAND_RANKS[HAND_TYPES.ROYAL_FLUSH] };
  }
  
  // 同花顺
  if (isFlush && isStraight) {
    return { type: HAND_TYPES.STRAIGHT_FLUSH, rank: HAND_RANKS[HAND_TYPES.STRAIGHT_FLUSH], highCard: parsedCards[0].rank };
  }
  
  // 四条
  const fourOfAKind = checkNOfAKind(parsedCards, 4);
  if (fourOfAKind) {
    return { type: HAND_TYPES.FOUR_OF_A_KIND, rank: HAND_RANKS[HAND_TYPES.FOUR_OF_A_KIND], value: fourOfAKind };
  }
  
  // 葫芦
  const fullHouse = checkFullHouse(parsedCards);
  if (fullHouse) {
    return { type: HAND_TYPES.FULL_HOUSE, rank: HAND_RANKS[HAND_TYPES.FULL_HOUSE], threeValue: fullHouse.three, twoValue: fullHouse.two };
  }
  
  // 同花
  if (isFlush) {
    return { type: HAND_TYPES.FLUSH, rank: HAND_RANKS[HAND_TYPES.FLUSH], highCard: parsedCards[0].rank };
  }
  
  // 顺子
  if (isStraight) {
    return { type: HAND_TYPES.STRAIGHT, rank: HAND_RANKS[HAND_TYPES.STRAIGHT], highCard: parsedCards[0].rank };
  }
  
  // 三条
  const threeOfAKind = checkNOfAKind(parsedCards, 3);
  if (threeOfAKind) {
    return { type: HAND_TYPES.THREE_OF_A_KIND, rank: HAND_RANKS[HAND_TYPES.THREE_OF_A_KIND], value: threeOfAKind };
  }
  
  // 两对
  const twoPair = checkTwoPair(parsedCards);
  if (twoPair) {
    return { type: HAND_TYPES.TWO_PAIR, rank: HAND_RANKS[HAND_TYPES.TWO_PAIR], highPair: twoPair.high, lowPair: twoPair.low };
  }
  
  // 对子
  const pair = checkNOfAKind(parsedCards, 2);
  if (pair) {
    return { type: HAND_TYPES.PAIR, rank: HAND_RANKS[HAND_TYPES.PAIR], value: pair };
  }
  
  // 高牌
  return { type: HAND_TYPES.HIGH_CARD, rank: HAND_RANKS[HAND_TYPES.HIGH_CARD], highCard: parsedCards[0].rank };
}

// 检查同花
function checkFlush(cards) {
  if (cards.length < 5) return false;
  
  const firstSuit = cards[0].suit;
  return cards.every(card => card.suit === firstSuit);
}

// 检查顺子
function checkStraight(cards) {
  if (cards.length < 5) return false;
  
  // 处理A可以作为1的特殊情况
  const ranks = cards.map(card => card.rank);
  if (ranks.includes(13) && ranks.includes(12) && ranks.includes(11) && ranks.includes(10) && ranks.includes(1)) {
    return true; // A, K, Q, J, 10
  }
  
  for (let i = 0; i <= cards.length - 5; i++) {
    let isStraight = true;
    for (let j = i; j < i + 4; j++) {
      if (cards[j].rank !== cards[j + 1].rank + 1) {
        isStraight = false;
        break;
      }
    }
    if (isStraight) return true;
  }
  
  return false;
}

// 检查N条
function checkNOfAKind(cards, n) {
  const rankCount = {};
  cards.forEach(card => {
    rankCount[card.rank] = (rankCount[card.rank] || 0) + 1;
  });
  
  for (const [rank, count] of Object.entries(rankCount)) {
    if (count === n) return parseInt(rank);
  }
  
  return null;
}

// 检查葫芦
function checkFullHouse(cards) {
  const threeOfAKind = checkNOfAKind(cards, 3);
  if (!threeOfAKind) return null;
  
  // 移除三条的牌，检查剩下的牌中是否有对子
  const remainingCards = cards.filter(card => card.rank !== threeOfAKind);
  const pair = checkNOfAKind(remainingCards, 2);
  
  if (pair) {
    return { three: threeOfAKind, two: pair };
  }
  
  return null;
}

// 检查两对
function checkTwoPair(cards) {
  const rankCount = {};
  cards.forEach(card => {
    rankCount[card.rank] = (rankCount[card.rank] || 0) + 1;
  });
  
  const pairs = [];
  for (const [rank, count] of Object.entries(rankCount)) {
    if (count === 2) {
      pairs.push(parseInt(rank));
    }
  }
  
  if (pairs.length >= 2) {
    pairs.sort((a, b) => b - a);
    return { high: pairs[0], low: pairs[1] };
  }
  
  return null;
}

// 比较两手牌
export function compareHands(hand1, hand2) {
  if (hand1.rank > hand2.rank) return 1;
  if (hand1.rank < hand2.rank) return -1;
  
  // 相同牌型，比较关键牌
  switch (hand1.type) {
    case HAND_TYPES.STRAIGHT_FLUSH:
    case HAND_TYPES.STRAIGHT:
      return hand1.highCard - hand2.highCard;
      
    case HAND_TYPES.FOUR_OF_A_KIND:
      if (hand1.value !== hand2.value) return hand1.value - hand2.value;
      break;
      
    case HAND_TYPES.FULL_HOUSE:
      if (hand1.threeValue !== hand2.threeValue) return hand1.threeValue - hand2.threeValue;
      if (hand1.twoValue !== hand2.twoValue) return hand1.twoValue - hand2.twoValue;
      break;
      
    case HAND_TYPES.FLUSH:
    case HAND_TYPES.HIGH_CARD:
      // 比较最高牌
      return hand1.highCard - hand2.highCard;
      
    case HAND_TYPES.THREE_OF_A_KIND:
      if (hand1.value !== hand2.value) return hand1.value - hand2.value;
      break;
      
    case HAND_TYPES.TWO_PAIR:
      if (hand1.highPair !== hand2.highPair) return hand1.highPair - hand2.highPair;
      if (hand1.lowPair !== hand2.lowPair) return hand1.lowPair - hand2.lowPair;
      break;
      
    case HAND_TYPES.PAIR:
      if (hand1.value !== hand2.value) return hand1.value - hand2.value;
      break;
  }
  
  // 如果所有关键牌都相同，比较剩余牌
  return 0;
}

// 验证十三水牌型
export function validateThirteenCards(hand) {
  const { top, middle, bottom } = hand;
  
  // 检查牌数
  if (top.length !== 3 || middle.length !== 5 || bottom.length !== 5) {
    return { valid: false, message: '头道3张，中道5张，尾道5张' };
  }
  
  // 评估各道牌型
  const topHand = evaluateHand(top);
  const middleHand = evaluateHand(middle);
  const bottomHand = evaluateHand(bottom);
  
  // 检查尾道必须大于中道，中道必须大于头道
  if (compareHands(bottomHand, middleHand) <= 0) {
    return { valid: false, message: '尾道必须大于中道' };
  }
  
  if (compareHands(middleHand, topHand) <= 0) {
    return { valid: false, message: '中道必须大于头道' };
  }
  
  return { 
    valid: true, 
    message: '牌型有效',
    evaluations: {
      top: topHand,
      middle: middleHand,
      bottom: bottomHand
    }
  };
}

// 在 gameLogic.js 文件末尾添加以下导出

// 检查特殊牌型
export function checkSpecialHandType(hand) {
  const { top, middle, bottom } = hand;
  const allCards = [...top, ...middle, ...bottom];
  
  // 一条龙：A到K各一张
  if (isDragon(allCards)) {
    return '一条龙';
  }
  
  // 十三幺：A、2、3、4、5、6、7、8、9、10、J、Q、K各一张，且同一花色
  if (isThirteenOrphans(allCards)) {
    return '十三幺';
  }
  
  // 三同花：三道都是同花
  if (isThreeFlush(hand)) {
    return '三同花';
  }
  
  // 三顺子：三道都是顺子
  if (isThreeStraight(hand)) {
    return '三顺子';
  }
  
  // 六对半：六对加一张单牌
  if (isSixPairs(allCards)) {
    return '六对半';
  }
  
  return null;
}

// 一条龙检查
function isDragon(cards) {
  if (cards.length !== 13) return false;
  
  const ranks = cards.map(card => parseInt(card.substring(1)));
  const uniqueRanks = [...new Set(ranks)];
  
  return uniqueRanks.length === 13;
}

// 十三幺检查
function isThirteenOrphans(cards) {
  if (cards.length !== 13) return false;
  
  // 检查是否包含A到K
  const ranks = cards.map(card => parseInt(card.substring(1)));
  const hasAllRanks = new Array(13).fill(0).every((_, i) => ranks.includes(i + 1));
  if (!hasAllRanks) return false;
  
  // 检查是否同一花色
  const suits = cards.map(card => card.charAt(0));
  const uniqueSuits = [...new Set(suits)];
  
  return uniqueSuits.length === 1;
}

// 三同花检查
function isThreeFlush(hand) {
  const topHand = evaluateHand(hand.top);
  const middleHand = evaluateHand(hand.middle);
  const bottomHand = evaluateHand(hand.bottom);
  
  return topHand.type === '同花' && middleHand.type === '同花' && bottomHand.type === '同花';
}

// 三顺子检查
function isThreeStraight(hand) {
  const topHand = evaluateHand(hand.top);
  const middleHand = evaluateHand(hand.middle);
  const bottomHand = evaluateHand(hand.bottom);
  
  return topHand.type === '顺子' && middleHand.type === '顺子' && bottomHand.type === '顺子';
}

// 六对半检查
function isSixPairs(cards) {
  if (cards.length !== 13) return false;
  
  const rankCount = {};
  cards.forEach(card => {
    const rank = parseInt(card.substring(1));
    rankCount[rank] = (rankCount[rank] || 0) + 1;
  });
  
  let pairCount = 0;
  let singleCount = 0;
  
  for (const count of Object.values(rankCount)) {
    if (count === 2) pairCount++;
    else if (count === 1) singleCount++;
  }
  
  return pairCount === 6 && singleCount === 1;
}