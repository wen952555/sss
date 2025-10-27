import { RANKS as VALUE_ORDER } from './pokerEvaluator.js';

export const SSS_SCORES = {
  'HEAD': { '三条': 3 },
  'MIDDLE': { '铁支': 8, '同花顺': 10, '葫芦': 2 },
  'TAIL': { '铁支': 4, '同花顺': 5 },
  'SPECIAL': { '一条龙': 13, '三同花': 3, '三顺子': 3, '六对半': 3, '大六对': 7, '高级三同花/三顺子': 8 },
};

// This "safe" parseCard can handle strings, objects, and invalid data without crashing.
const parseCard = (cardInput) => {
    if (!cardInput) return null;
    if (typeof cardInput === 'object' && cardInput.rank) {
        return { ...cardInput, value: VALUE_ORDER[cardInput.rank] };
    }
    if (typeof cardInput === 'string') {
        const parts = cardInput.split('_');
        if (parts.length < 3) return null;
        const rank = parts[0];
        const suit = parts[2];
        const value = VALUE_ORDER[rank];
        if (!value) return null;
        return { rank, suit, value };
    }
    return null;
};


export const SUIT_ORDER = { 'spades': 4, 'hearts': 3, 'clubs': 2, 'diamonds': 1 };

export function getGroupedValues(cards) {
  const counts = {};
  for (const cardStr of cards) {
    const card = parseCard(cardStr);
    if (card && card.value) {
      counts[card.value] = (counts[card.value] || 0) + 1;
    }
  }
  const groups = {};
  for (const val in counts) {
    const count = counts[val];
    if (!groups[count]) groups[count] = [];
    groups[count].push(parseInt(val));
  }
  for (const group in groups) {
    groups[group].sort((a, b) => b - a);
  }
  return groups;
}

export function isStraight(cards) {
  if (!cards || cards.length === 0) return false;
  const parsedCards = cards.map(parseCard).filter(Boolean);
  if (parsedCards.length !== cards.length) return false;

  const unique_ranks = [...new Set(parsedCards.map(c => c.value))];
  if (unique_ranks.length !== cards.length) return false;
  unique_ranks.sort((a, b) => a - b);
  const is_a2345 = JSON.stringify(unique_ranks) === JSON.stringify([2, 3, 4, 5, 14]);
  return (unique_ranks[unique_ranks.length - 1] - unique_ranks[0] === cards.length - 1) || is_a2345;
}

export function isFlush(cards) {
  if (!cards || cards.length === 0) return false;
  const parsedCards = cards.map(parseCard).filter(Boolean);
  if (parsedCards.length !== cards.length) return false;

  const first_suit = parsedCards[0].suit;
  return parsedCards.every(c => c.suit === first_suit);
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
  // Defensive check: If a lane is not a valid array, treat it as the lowest possible hand.
  const safeA = Array.isArray(a) ? a : [];
  const safeB = Array.isArray(b) ? b : [];

  const typeA = getSssAreaType(safeA, area);
  const typeB = getSssAreaType(safeB, area);
  const rankA = sssAreaTypeRank(typeA, area);
  const rankB = sssAreaTypeRank(typeB, area);
  if (rankA !== rankB) return rankA - rankB;

  if (typeA === '顺子' || typeA === '同花顺') {
    const getStraightHighCard = (cards) => {
      const parsedCards = cards.map(parseCard).filter(Boolean);
      if (parsedCards.length !== cards.length) return 0; // Invalid straight

      let vals = [...new Set(parsedCards.map(c => c.value))];
      vals.sort((a, b) => a - b);
      const isAceLow = JSON.stringify(vals) === JSON.stringify([2, 3, 4, 5, 14]);
      // For A-2-3-4-5, the high card for ranking purposes is the 5.
      if (isAceLow) return 5;

      return vals[vals.length - 1]; // Otherwise, it's the highest value card.
    };
    const valA = getStraightHighCard(a);
    const valB = getStraightHighCard(b);
    if (valA !== valB) return valA - valB;
  }

  // If straights are equal, compare by suit of high card (for straight flushes)
  if (typeA === '同花' || typeA === '同花顺') {
    const parsedA = a.map(parseCard).filter(Boolean);
    const parsedB = b.map(parseCard).filter(Boolean);
    if (parsedA.length !== a.length || parsedB.length !== b.length) return 0; // Contains invalid cards

    // Sort by value to find the highest card to compare suits
    parsedA.sort((c1, c2) => c2.value - c1.value);
    parsedB.sort((c1, c2) => c2.value - c1.value);

    const suitA = SUIT_ORDER[parsedA[0].suit];
    const suitB = SUIT_ORDER[parsedB[0].suit];
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
    // Defensive check: Ensure all lanes are arrays before spreading.
    const all_cards = [
        ...(Array.isArray(hand.top) ? hand.top : []),
        ...(Array.isArray(hand.middle) ? hand.middle : []),
        ...(Array.isArray(hand.bottom) ? hand.bottom : [])
    ];

    // Filter out any null or invalid card entries after parsing
    const parsedCards = all_cards.map(parseCard).filter(Boolean);

    // If parsing results in a different number of cards, we have invalid data.
    if (parsedCards.length !== 13) {
        return null;
    }

    const ranks = parsedCards.map(card => card.rank);
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
