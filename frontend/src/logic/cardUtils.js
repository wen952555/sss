// frontend_react/src/logic/cardUtils.js
export const SUITS = { s: 'spades', h: 'hearts', c: 'clubs', d: 'diamonds' };
export const SUIT_NAMES = { s: '黑桃', h: '红桃', c: '梅花', d: '方块' };
export const SUIT_RANK = { s: 4, h: 3, c: 2, d: 1 }; // 用于比花色

export const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const VALUE_NAMES = { // 用于显示和图片文件名
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  'T': '10', 'J': 'jack', 'Q': 'queen', 'K': 'king', 'A': 'ace'
};
export const RANK_VALUES = { // 用于比较大小
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export const createDeck = () => {
  const deck = [];
  for (const suit of Object.keys(SUITS)) {
    for (const value of VALUES) {
      deck.push({
        id: `${value}${suit}`, // e.g., 'As' for Ace of Spades
        value: value,         // 'A', 'K', 'T', '2'
        suit: suit,           // 's', 'h', 'c', 'd'
        rankValue: RANK_VALUES[value],
        suitRank: SUIT_RANK[suit],
        name: `${SUIT_NAMES[suit]}${value === 'T' ? '10' : (VALUE_NAMES[value].length > 2 ? VALUE_NAMES[value].charAt(0).toUpperCase() + VALUE_NAMES[value].slice(1) : value)}`, // e.g. 黑桃A, 梅花10
        image: `${VALUE_NAMES[value]}_of_${SUITS[suit]}.svg` // e.g., ace_of_spades.svg
      });
    }
  }
  return deck;
};

export const shuffleDeck = (deck) => {
  let shuffledDeck = [...deck];
  for (let i = shuffledDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
  }
  return shuffledDeck;
};

// 比较两张单牌（用于排序或比较散牌大小）
export const compareCards = (cardA, cardB) => {
  if (cardA.rankValue !== cardB.rankValue) {
    return cardA.rankValue - cardB.rankValue;
  }
  return cardA.suitRank - cardB.suitRank; // 同点数比花色
};

// --- 牌型判断辅助函数 (简化版) ---
// 这部分非常复杂，这里只提供基础框架，十三水特殊牌型需要额外逻辑

// 判断是否是顺子 (A2345算最小顺子，TJQKA最大)
export const isStraight = (cards) => {
  if (cards.length !== 5) return false;
  const sortedCards = [...cards].sort(compareCards);
  // A2345 特殊处理
  if (sortedCards[4].value === 'A' &&
      sortedCards[0].value === '2' &&
      sortedCards[1].value === '3' &&
      sortedCards[2].value === '4' &&
      sortedCards[3].value === '5') {
    return { type: 'straight', highCardRank: 5, cards: sortedCards, name: '顺子 (A2345)' }; // A算5
  }
  for (let i = 0; i < 4; i++) {
    if (sortedCards[i+1].rankValue - sortedCards[i].rankValue !== 1) return false;
  }
  return { type: 'straight', highCardRank: sortedCards[4].rankValue, cards: sortedCards, name: '顺子' };
};

// 判断是否是同花
export const isFlush = (cards) => {
  if (cards.length !== 5) return false;
  const firstSuit = cards[0].suit;
  if (cards.every(card => card.suit === firstSuit)) {
    const sortedCards = [...cards].sort((a,b) => b.rankValue - a.rankValue); // 从大到小方便比较
    return { type: 'flush', highCardRank: sortedCards[0].rankValue, cards: sortedCards, suit: firstSuit, name: '同花' };
  }
  return false;
};

// 判断牌型 (对子、两对、三条、葫芦、铁支、同花顺等)
// 返回一个对象 { type: 'pair'/'two_pair'/'three_of_a_kind'/'straight'/'flush'/'full_house'/'four_of_a_kind'/'straight_flush'/'high_card', rank: ..., cards: ... }
// `rank` 用于比较同牌型的大小，`cards` 是排序后的牌
export const evaluateHand = (hand) => { // hand 是一个包含3张或5张牌的数组
  if (!hand || (hand.length !== 3 && hand.length !== 5)) return { type: 'invalid', rank: 0, cards: hand, name: '无效墩' };
  
  const counts = {}; // 记录每个点数出现的次数
  hand.forEach(card => {
    counts[card.rankValue] = (counts[card.rankValue] || 0) + 1;
  });

  const uniqueRanks = Object.keys(counts).map(Number).sort((a, b) => b - a); // 牌的点数从大到小
  const rankCounts = uniqueRanks.map(rank => counts[rank]); // 对应点数的张数

  const sortedHand = [...hand].sort(compareCards); // 从小到大排序

  // 5张牌的牌型
  if (hand.length === 5) {
    const straight = isStraight(hand);
    const flush = isFlush(hand);

    if (straight && flush) {
      // A2345同花顺特殊处理，A算5
      const isAceLowStraightFlush = straight.highCardRank === 5;
      return { type: 'straight_flush', rank: 900 + (isAceLowStraightFlush ? 5 : straight.highCardRank), cards: straight.cards, name: '同花顺' };
    }
    if (rankCounts.includes(4)) { // 铁支 (四条)
      const fourRank = uniqueRanks[rankCounts.indexOf(4)];
      const kicker = uniqueRanks.find(r => r !== fourRank);
      return { type: 'four_of_a_kind', rank: 800 + fourRank + (kicker || 0) / 100, cards: sortedHand, name: '铁支' };
    }
    if (rankCounts.includes(3) && rankCounts.includes(2)) { // 葫芦
      const threeRank = uniqueRanks[rankCounts.indexOf(3)];
      const pairRank = uniqueRanks[rankCounts.indexOf(2)];
      return { type: 'full_house', rank: 700 + threeRank + pairRank / 100, cards: sortedHand, name: '葫芦' };
    }
    if (flush) {
      return { type: 'flush', rank: 600 + flush.cards.reduce((sum, c, i) => sum + c.rankValue * Math.pow(0.1, i+1), 0), cards: flush.cards, name: '同花' }; // 使用所有牌的点数加权比较
    }
    if (straight) {
       // A2345顺子特殊处理，A算5
      const isAceLowStraight = straight.highCardRank === 5;
      return { type: 'straight', rank: 500 + (isAceLowStraight ? 5 : straight.highCardRank), cards: straight.cards, name: '顺子' };
    }
    if (rankCounts.includes(3)) { // 三条
      const threeRank = uniqueRanks[rankCounts.indexOf(3)];
      const kickers = uniqueRanks.filter(r => r !== threeRank).slice(0, 2);
      return { type: 'three_of_a_kind', rank: 400 + threeRank + (kickers[0] || 0) / 100 + (kickers[1] || 0) / 10000, cards: sortedHand, name: '三条' };
    }
    if (rankCounts.filter(c => c === 2).length === 2) { // 两对
      const pairRanks = uniqueRanks.filter(r => counts[r] === 2).sort((a,b) => b-a);
      const kicker = uniqueRanks.find(r => counts[r] === 1);
      return { type: 'two_pair', rank: 300 + pairRanks[0] + pairRanks[1]/100 + (kicker || 0)/10000, cards: sortedHand, name: '两对' };
    }
    if (rankCounts.includes(2)) { // 一对
      const pairRank = uniqueRanks[rankCounts.indexOf(2)];
      const kickers = uniqueRanks.filter(r => r !== pairRank).slice(0, 3);
      return { type: 'pair', rank: 200 + pairRank + kickers.reduce((sum, k, i) => sum + k * Math.pow(0.1, i+1), 0) , cards: sortedHand, name: '一对' };
    }
    // 散牌 (乌龙)
    return { type: 'high_card', rank: 100 + sortedHand.reduce((sum, c, i) => sum + c.rankValue * Math.pow(0.1, i+1), 0), cards: sortedHand, name: '乌龙' };
  }

  // 3张牌的牌型 (头墩)
  if (hand.length === 3) {
    if (rankCounts.includes(3)) { // 三条 (冲三)
      const threeRank = uniqueRanks[rankCounts.indexOf(3)];
      return { type: 'three_of_a_kind_3', rank: 400 + threeRank, cards: sortedHand, name: '冲三' }; // 与五张三条区分
    }
    if (rankCounts.includes(2)) { // 一对
      const pairRank = uniqueRanks[rankCounts.indexOf(2)];
      const kicker = uniqueRanks.find(r => counts[r] === 1);
      return { type: 'pair_3', rank: 200 + pairRank + (kicker || 0)/100, cards: sortedHand, name: '一对' };
    }
    // 散牌 (乌龙)
    return { type: 'high_card_3', rank: 100 + sortedHand.reduce((sum, c, i) => sum + c.rankValue * Math.pow(0.1, i+1), 0), cards: sortedHand, name: '乌龙' };
  }
  return { type: 'unknown', rank: 0, cards: hand, name: '未知' };
};

// 比较两个已评估的墩牌 (墩牌A, 墩牌B)
// 返回 > 0 如果墩A大, < 0 如果墩B大, 0 如果一样大 (理论上十三水不会完全一样除非同花色同点)
export const compareEvaluatedHands = (evalHandA, evalHandB) => {
  if (evalHandA.rank !== evalHandB.rank) {
    return evalHandA.rank - evalHandB.rank;
  }
  // 如果牌型和主要点数都相同，理论上需要比较次要牌或花色
  // 对于十三水，通常如果rank相同，则认为是平手或根据规则比最大单张花色
  // 简化处理：rank相同视为相同，具体游戏规则可能更细致
  // 例如：同为同花，rank可能已经包含了花色信息（如果设计如此）或需要额外比较
  if (evalHandA.type === 'flush' && evalHandB.type === 'flush') {
    // 之前rank计算已包含所有牌点数，理论上不需要再比
    // 如果需要比最高牌的花色：
    // for (let i = 0; i < evalHandA.cards.length; i++) {
    //   if (evalHandA.cards[i].suitRank !== evalHandB.cards[i].suitRank) {
    //     return evalHandA.cards[i].suitRank - evalHandB.cards[i].suitRank;
    //   }
    // }
  }
  return 0; 
};

// 检查三墩牌是否合法 (头墩 <= 中墩 <= 尾墩)
export const isValidArrangement = (tou, zhong, wei) => {
  if (!tou || !zhong || !wei || tou.length !== 3 || zhong.length !== 5 || wei.length !== 5) {
    return false; // 数量不对
  }
  const evalTou = evaluateHand(tou);
  const evalZhong = evaluateHand(zhong);
  const evalWei = evaluateHand(wei);

  // console.log("Tou:", evalTou);
  // console.log("Zhong:", evalZhong);
  // console.log("Wei:", evalWei);

  const touVSzhong = compareEvaluatedHands(evalTou, evalZhong);
  const zhongVSwei = compareEvaluatedHands(evalZhong, evalWei);
  
  return touVSzhong <= 0 && zhongVSwei <= 0;
};
