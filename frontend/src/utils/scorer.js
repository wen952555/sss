export const VALUE_ORDER = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};

export const SSS_SCORES = {
  'HEAD': { '三条': 3 },
  'MIDDLE': { '铁支': 8, '同花顺': 10, '葫芦': 2 },
  'TAIL': { '铁支': 4, '同花顺': 5 },
  'SPECIAL': { '一条龙': 13, '三同花': 3, '三顺子': 3, '六对半': 3, '大六对': 7, '高级三同花/三顺子': 8 },
};

export const SUIT_ORDER = { 'spades': 4, 'hearts': 3, 'clubs': 2, 'diamonds': 1 };

export function parseCard(cardStr) {
  const parts = cardStr.split('_');
  return { rank: parts[0], suit: parts[2] };
}

export function getGroupedValues(cards) {
  const counts = {};
  for (const card of cards) {
    const val = VALUE_ORDER[parseCard(card).rank];
    counts[val] = (counts[val] || 0) + 1;
  }
  const groups = {};
  for (const val in counts) {
    const count = counts[val];
    if (!groups[count]) {
      groups[count] = [];
    }
    groups[count].push(parseInt(val));
  }
  for (const group in groups) {
    groups[group].sort((a, b) => b - a);
  }
  return groups;
}

export function isStraight(cards) {
  if (!cards || cards.length === 0) return false;
  const unique_ranks = [...new Set(cards.map(c => VALUE_ORDER[parseCard(c).rank]))];
  if (unique_ranks.length !== cards.length) return false;
  unique_ranks.sort((a, b) => a - b);
  const is_a2345 = JSON.stringify(unique_ranks) === JSON.stringify([2, 3, 4, 5, 14]);
  const is_normal = (unique_ranks[unique_ranks.length - 1] - unique_ranks[0] === cards.length - 1);
  return is_normal || is_a2345;
}

export function isFlush(cards) {
  if (!cards || cards.length === 0) return false;
  const first_suit = parseCard(cards[0]).suit;
  for (const card of cards) {
    if (parseCard(card).suit !== first_suit) {
      return false;
    }
  }
  return true;
}

export function getSssAreaType(cards, area) {
  if (!cards || cards.length === 0) return "高牌";
  const grouped = getGroupedValues(cards);
  const isF = isFlush(cards);
  const isS = isStraight(cards);
  if (cards.length === 3) {
    if (grouped[3]) return "三条";
    if (grouped[2]) return "对子";
    return "高牌";
  }
  if (isF && isS) return "同花顺";
  if (grouped[4]) return "铁支";
  if (grouped[3] && grouped[2]) return "葫芦";
  if (isF) return "同花";
  if (isS) return "顺子";
  if (grouped[3]) return "三条";
  if (grouped[2] && grouped[2].length === 2) return "两对";
  if (grouped[2]) return "对子";
  return "高牌";
}

export function sssAreaTypeRank(type, area) {
  const ranks = { "高牌": 1, "对子": 2, "两对": 3, "三条": 4, "顺子": 5, "同花": 6, "葫芦": 7, "铁支": 8, "同花顺": 9 };
  if (area === 'head' && type === '三条') return 4;
  return ranks[type] || 1;
}

export function compareSssArea(a, b, area) {
  const typeA = getSssAreaType(a, area);
  const typeB = getSssAreaType(b, area);
  const rankA = sssAreaTypeRank(typeA, area);
  const rankB = sssAreaTypeRank(typeB, area);
  if (rankA !== rankB) return rankA - rankB;

  if (typeA === '顺子' || typeA === '同花顺') {
    const getStraightHighCard = (cards) => {
      let vals = [...new Set(cards.map(c => VALUE_ORDER[parseCard(c).rank]))];
      vals.sort((a, b) => a - b);
      if (JSON.stringify(vals) === JSON.stringify([2, 3, 4, 5, 14])) {
        return 5;
      }
      return vals[vals.length - 1];
    };
    const valA = getStraightHighCard(a);
    const valB = getStraightHighCard(b);
    if (valA !== valB) return valA - valB;
  }

  if (typeA === '同花' || typeA === '同花顺') {
    const suitA = SUIT_ORDER[parseCard(a[0]).suit];
    const suitB = SUIT_ORDER[parseCard(b[0]).suit];
    if (suitA !== suitB) return suitA - suitB;
  }

  const groupedA = getGroupedValues(a);
  const groupedB = getGroupedValues(b);

  const sortedKeysA = Object.keys(groupedA).sort((a, b) => b - a);
  const sortedKeysB = Object.keys(groupedB).sort((a, b) => b - a);

  let sortedValuesA = [];
  for (const key of sortedKeysA) {
    sortedValuesA = sortedValuesA.concat(groupedA[key]);
  }
  let sortedValuesB = [];
  for (const key of sortedKeysB) {
    sortedValuesB = sortedValuesB.concat(groupedB[key]);
  }

  for (let i = 0; i < sortedValuesA.length; i++) {
    if (sortedValuesA[i] !== sortedValuesB[i]) return sortedValuesA[i] - sortedValuesB[i];
  }

  return 0;
}

export function isSssFoul(hand) {
  const headRank = sssAreaTypeRank(getSssAreaType(hand.top, 'head'), 'head');
  const midRank = sssAreaTypeRank(getSssAreaType(hand.middle, 'middle'), 'middle');
  const tailRank = sssAreaTypeRank(getSssAreaType(hand.bottom, 'tail'), 'tail');
  if (headRank > midRank || midRank > tailRank) return true;
  if (headRank === midRank && compareSssArea(hand.top, hand.middle, 'head') > 0) return true;
  if (midRank === tailRank && compareSssArea(hand.middle, hand.bottom, 'middle') > 0) return true;
  return false;
}

export function getSssAreaScore(cards, area) {
  const type = getSssAreaType(cards, area);
  const areaUpper = area.toUpperCase();
  return SSS_SCORES[areaUpper]?.[type] ?? 1;
}

export function getSpecialType(hand) {
    const all_cards = [...hand.top, ...hand.middle, ...hand.bottom];

    const ranks = all_cards.map(card => parseCard(card).rank);
    if (new Set(ranks).size === 13) {
        return '一条龙';
    }

    const groupedAll = getGroupedValues(all_cards);

    if (groupedAll[4]) {
        return '大六对';
    }
    if (groupedAll[2]?.length === 6 && !groupedAll[3]) {
        return '六对半';
    }

    const isHeadFlush = isFlush(hand.top);
    const isMidFlush = isFlush(hand.middle);
    const isTailFlush = isFlush(hand.bottom);

    const isHeadStraight = isStraight(hand.top);
    const isMidStraight = isStraight(hand.middle);
    const isTailStraight = isStraight(hand.bottom);

    if (isHeadFlush && isMidFlush && isTailFlush) {
        if (getSssAreaType(hand.middle, 'middle') === '同花顺' || getSssAreaType(hand.bottom, 'tail') === '同花顺') {
            return '高级三同花/三顺子';
        }
        return '三同花';
    }

    if (isHeadStraight && isMidStraight && isTailStraight) {
        if (getSssAreaType(hand.middle, 'middle') === '同花顺' || getSssAreaType(hand.bottom, 'tail') === '同花顺') {
            return '高级三同花/三顺子';
        }
        return '三顺子';
    }

    return null;
}

export function calculateTotalBaseScore(p_hand, p_special_type = null) {
    if (p_special_type) {
        return SSS_SCORES['SPECIAL'][p_special_type] ?? 0;
    }
    return getSssAreaScore(p_hand.top, 'head') + getSssAreaScore(p_hand.middle, 'middle') + getSssAreaScore(p_hand.bottom, 'tail');
}

export function calculateSinglePairScore(p1_hand, p2_hand) {
    const p1_special_type = getSpecialType(p1_hand);
    const p2_special_type = getSpecialType(p2_hand);

    if (p1_special_type && !p2_special_type) {
        return SSS_SCORES['SPECIAL'][p1_special_type] ?? 0;
    }
    if (!p1_special_type && p2_special_type) {
        return -(SSS_SCORES['SPECIAL'][p2_special_type] ?? 0);
    }
    if (p1_special_type && p2_special_type) {
        return 0;
    }

    let pairScore = 0;
    const area_map = { top: 'head', middle: 'middle', bottom: 'tail' };
    for (const hand_key in area_map) {
        const area_name = area_map[hand_key];
        const cmp = compareSssArea(p1_hand[hand_key], p2_hand[hand_key], area_name);
        if (cmp > 0) {
            pairScore += getSssAreaScore(p1_hand[hand_key], area_name);
        } else if (cmp < 0) {
            pairScore -= getSssAreaScore(p2_hand[hand_key], area_name);
        }
    }
    return pairScore;
}
