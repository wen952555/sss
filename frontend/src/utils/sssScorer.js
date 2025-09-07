// --- START OF FILE frontend/src/utils/sssScorer.js ---

/**
 * sssScore.final.simplified.js - 十三水最终版比牌计分器 (极简规则)
 * 同花顺/同花先比最大花色，花色相同则比两手牌最大单张归属
 */

const VALUE_ORDER = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};
const SUIT_ORDER = { spades: 4, hearts: 3, clubs: 2, diamonds: 1 };

const SCORES = {
  HEAD: { '三条': 3 },
  MIDDLE: { '铁支': 8, '同花顺': 10, '葫芦': 2 },
  TAIL: { '铁支': 4, '同花顺': 5 },
  SPECIAL: { '一条龙': 13, '三同花': 4, '三顺子': 4, '六对半': 3 },
};

/**
 * 计算两个玩家之间的胜负分 (十三张)
 * @param {Object} p1 - 玩家1的数据对象
 * @param {Object} p2 - 玩家2的数据对象
 * @returns {number} 返回 p1 相对于 p2 的得分
 */
export function calculateSinglePairScore(p1, p2) {
    const p1Info = { ...p1, isFoul: isFoul(p1.head, p1.middle, p1.tail), specialType: null };
    p1Info.specialType = p1Info.isFoul ? null : getSpecialType(p1Info);
    
    const p2Info = { ...p2, isFoul: isFoul(p2.head, p2.middle, p2.tail), specialType: null };
    p2Info.specialType = p2Info.isFoul ? null : getSpecialType(p2Info);

    let score = 0;
    let laneResults = []; // [P1 vs P2 head, middle, tail] -> 'win', 'loss', 'draw'

    if (p1Info.isFoul && !p2Info.isFoul) {
        score = -calculateTotalBaseScore(p2Info);
        laneResults = ['loss', 'loss', 'loss']; // Or some other indicator of a foul
    } else if (!p1Info.isFoul && p2Info.isFoul) {
        score = calculateTotalBaseScore(p1Info);
        laneResults = ['win', 'win', 'win'];
    } else if (p1Info.isFoul && p2Info.isFoul) {
        score = 0;
        laneResults = ['draw', 'draw', 'draw'];
    } else if (p1Info.specialType && !p2Info.specialType) {
        score = SCORES.SPECIAL[p1Info.specialType] || 0;
        laneResults = ['win', 'win', 'win']; // Special hand beats normal hand
    } else if (!p1Info.specialType && p2Info.specialType) {
        score = -(SCORES.SPECIAL[p2Info.specialType] || 0);
        laneResults = ['loss', 'loss', 'loss'];
    } else if (p1Info.specialType && p2Info.specialType) {
        score = 0; // Or compare special hands, for now, draw
        laneResults = ['draw', 'draw', 'draw'];
    } else {
        for (const area of ['head', 'middle', 'tail']) {
            const cmp = compareArea(p1Info[area], p2Info[area], area);
            if (cmp > 0) {
                score += getAreaScore(p1Info[area], area);
                laneResults.push('win');
            } else if (cmp < 0) {
                score -= getAreaScore(p2Info[area], area);
                laneResults.push('loss');
            } else {
                laneResults.push('draw');
            }
        }
    }
    return { score, laneResults };
}

export function calcSSSAllScores(players) {
  const N = players.length;
  if (N < 2) return new Array(N).fill(0);
  let marks = new Array(N).fill(0);
  const playerInfos = players.map(p => {
    const foul = isFoul(p.head, p.middle, p.tail);
    const specialType = foul ? null : getSpecialType(p);
    return { ...p, isFoul: foul, specialType };
  });

  for (let i = 0; i < N; ++i) {
    for (let j = i + 1; j < N; ++j) {
      const result = calculateSinglePairScore(playerInfos[i], playerInfos[j]);
      marks[i] += result.score;
      marks[j] -= result.score;
    }
  }
  return marks;
}

export function calculateTotalBaseScore(p) {
  if (p.specialType) return SCORES.SPECIAL[p.specialType] || 0;
  return getAreaScore(p.head, 'head') + getAreaScore(p.middle, 'middle') + getAreaScore(p.tail, 'tail');
}

export function isFoul(head, middle, tail) {
  const headRank = areaTypeRank(getAreaType(head, 'head'), 'head');
  const midRank = areaTypeRank(getAreaType(middle, 'middle'), 'middle');
  const tailRank = areaTypeRank(getAreaType(tail, 'tail'), 'tail');
  if (headRank > midRank || midRank > tailRank) return true;
  if (headRank === midRank && compareArea(head, middle, 'head') > 0) return true;
  if (midRank === tailRank && compareArea(middle, tail, 'middle') > 0) return true;
  return false;
}

export function getAreaType(cards, area) {
  if (!cards || cards.length === 0) return "高牌";
  const grouped = getGroupedValues(cards);
  const isF = isFlush(cards);
  const isS = isStraight(cards);

  if (cards.length === 3) {
    if (grouped[3]) return "三条";
    if (grouped[2]) return "对子";
    return "高牌";
  }
  if (grouped[5]) return "五条";
  if (isF && isS) return "同花顺";
  if (grouped[4]) return "铁支";
  if (grouped[3] && grouped[2]) return "葫芦";
  if (isF) return "同花";
  if (isS) return "顺子";
  if (grouped[3]) return "三条";
  if (grouped[2]?.length === 2) return "两对";
  if (grouped[2]) return "对子";
  return "高牌";
}

export function areaTypeRank(type, area) {
  if (area === 'head') {
    if (type === "三条") return 4;
    if (type === "对子") return 2;
    return 1;
  }
  if (type === "五条") return 10;
  if (type === "同花顺") return 9;
  if (type === "铁支") return 8;
  if (type === "葫芦") return 7;
  if (type === "同花") return 6;
  if (type === "顺子") return 5;
  if (type === "三条") return 4;
  if (type === "两对") return 3;
  if (type === "对子") return 2;
  return 1;
}

export function getAreaScore(cards, area) {
  const type = getAreaType(cards, area);
  const areaUpper = area.toUpperCase();
  return SCORES[areaUpper]?.[type] || 1;
}

function getGroupedValues(cards) {
  const counts = {};
  cards.forEach(card => {
    const val = VALUE_ORDER[card.split('_')[0]];
    counts[val] = (counts[val] || 0) + 1;
  });
  const groups = {};
  for (const val in counts) {
    const count = counts[val];
    if (!groups[count]) groups[count] = [];
    groups[count].push(Number(val));
  }
  for (const count in groups) {
    groups[count].sort((a, b) => b - a);
  }
  return groups;
}

function isStraight(cards) {
  if (!cards || cards.length === 0) return false;
  let vals = [...new Set(cards.map(c => VALUE_ORDER[c.split('_')[0]]))].sort((a, b) => a - b);
  if (vals.length !== cards.length) return false;
  const isA2345 = JSON.stringify(vals.sort()) === JSON.stringify([2,3,4,5,14].sort());
  const isNormalStraight = (vals[vals.length - 1] - vals[0] === cards.length - 1);
  return isNormalStraight || isA2345;
}
function isFlush(cards) {
  if (!cards || cards.length === 0) return false;
  const firstSuit = cards[0].split('_')[2];
  return cards.every(c => c.split('_')[2] === firstSuit);
}

function compareArea(a, b, area) {
  const typeA = getAreaType(a, area);
  const typeB = getAreaType(b, area);
  const rankA = areaTypeRank(typeA, area);
  const rankB = areaTypeRank(typeB, area);
  if (rankA !== rankB) return rankA - rankB;

  // Special handling for straights according to house rules
  if (typeA === '顺子' && typeB === '顺子') {
      const getStraightValue = (cards) => {
          let vals = [...new Set(cards.map(c => VALUE_ORDER[c.split('_')[0]]))].sort((a, b) => a - b);
          const isA2345 = JSON.stringify(vals) === JSON.stringify([2,3,4,5,14]);
          if (isA2345) return 13.5; // Second highest straight
          return vals[vals.length - 1]; // Highest card
      };
      const valA = getStraightValue(a);
      const valB = getStraightValue(b);
      if (valA !== valB) return valA - valB;
      return 0;
  }

  if ( (typeA === '同花顺' && typeB === '同花顺') || (typeA === '同花' && typeB === '同花') ) {
    const suitA = SUIT_ORDER[a[0].split('_')[2]];
    const suitB = SUIT_ORDER[b[0].split('_')[2]];
    if (suitA !== suitB) return suitA - suitB;
    const all = [...a, ...b];
    let maxCard = all[0];
    for (const c of all) {
      const [val, , suit] = c.split('_');
      const [maxVal, , maxSuit] = maxCard.split('_');
      if (VALUE_ORDER[val] > VALUE_ORDER[maxVal] || (VALUE_ORDER[val] === VALUE_ORDER[maxVal] && SUIT_ORDER[suit] > SUIT_ORDER[maxSuit]))
        maxCard = c;
    }
    return a.includes(maxCard) ? 1 : (b.includes(maxCard) ? -1 : 0);
  }

  const groupedA = getGroupedValues(a);
  const groupedB = getGroupedValues(b);
  const sortedValuesA = Object.entries(groupedA).sort((x, y) => y[0] - x[0]).flatMap(entry => entry[1]);
  const sortedValuesB = Object.entries(groupedB).sort((x, y) => y[0] - x[0]).flatMap(entry => entry[1]);
  for(let i=0; i<sortedValuesA.length; i++) {
    if(sortedValuesA[i] !== sortedValuesB[i]) return sortedValuesA[i] - sortedValuesB[i];
  }

  return 0;
}

function getStraightRank(cards) {
  let vals = [...new Set(cards.map(c => VALUE_ORDER[c.split('_')[0]]))].sort((a, b) => a - b);
  if (JSON.stringify(vals.sort()) === JSON.stringify([2,3,4,5,14].sort())) return 5;
  return vals[vals.length - 1];
}

export function getSpecialType(p) {
  const all = [...p.head, ...p.middle, ...p.tail];
  const uniqVals = new Set(all.map(c => c.split('_')[0]));
  if (uniqVals.size === 13) return '一条龙';
  const groupedAll = getGroupedValues(all);
  if (groupedAll['2']?.length === 6 && !groupedAll['3'] && !groupedAll['4']) return '六对半';
  if (isFlush(p.head) && isFlush(p.middle) && isFlush(p.tail)) return '三同花';
  if (isStraight(p.head) && isStraight(p.middle) && isStraight(p.tail)) return '三顺子';
  return null;
}

// --- END OF FILE frontend/src/utils/sssScorer.js ---