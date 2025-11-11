// 牌型验证工具

// 验证单张牌代码格式
export function isValidCardCode(cardCode) {
  if (!cardCode || typeof cardCode !== 'string') return false;
  
  const suit = cardCode.charAt(0).toLowerCase();
  const rank = parseInt(cardCode.substring(1));
  
  if (!['s', 'h', 'c', 'd'].includes(suit)) return false;
  if (isNaN(rank) || rank < 1 || rank > 13) return false;
  
  return true;
}

// 验证牌数组
export function validateCards(cards) {
  if (!Array.isArray(cards)) return false;
  
  // 检查是否有重复牌
  const uniqueCards = [...new Set(cards)];
  if (uniqueCards.length !== cards.length) {
    return { valid: false, message: '有重复的牌' };
  }
  
  // 检查每张牌格式
  for (const card of cards) {
    if (!isValidCardCode(card)) {
      return { valid: false, message: `无效的牌代码: ${card}` };
    }
  }
  
  return { valid: true, message: '牌组有效' };
}

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
  const { evaluateHand } = require('./gameLogic');
  
  const topHand = evaluateHand(hand.top);
  const middleHand = evaluateHand(hand.middle);
  const bottomHand = evaluateHand(hand.bottom);
  
  return topHand.type === '同花' && middleHand.type === '同花' && bottomHand.type === '同花';
}

// 三顺子检查
function isThreeStraight(hand) {
  const { evaluateHand } = require('./gameLogic');
  
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