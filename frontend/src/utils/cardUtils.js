// client/src/utils/cardUtils.js

const RANK_MAP = {
  'A': 'ace',
  'K': 'king',
  'Q': 'queen',
  'J': 'jack',
  '10': '10',
  '9': '9',
  '8': '8',
  '7': '7',
  '6': '6',
  '5': '5',
  '4': '4',
  '3': '3',
  '2': '2',
};

// 如果你需要处理大小王
// const JOKER_MAP = {
//   'RED': 'red_joker',
//   'BLACK': 'black_joker'
// };

/**
 * 根据卡片对象获取对应的图片 URL
 * @param {Object} card - 例如 { suit: 'spades', rank: 'A' }
 * @returns {string} - 图片的路径, e.g., "/cards/ace_of_spades.svg"
 */
export const getCardImageUrl = (card) => {
  if (!card || !card.suit || !card.rank) {
    // 返回一个默认的“牌背”图片
    return '/cards/back.svg'; // 假设你有一张名为 back.svg 的牌背图片
  }

  const rankStr = RANK_MAP[card.rank];
  const suitStr = card.suit;

  return `/cards/${rankStr}_of_${suitStr}.svg`;
};
