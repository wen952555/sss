// frontend/src/utils/cardUtils.js

// 卡牌点数和花色的映射
export const RANKS_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const SUITS_CHAR = ['D', 'C', 'H', 'S'];

// 内部表示与图片文件名部分的映射 (文件名不变，只是后缀变)
const rankToFilenamePart = {
  'A': 'ace', 'K': 'king', 'Q': 'queen', 'J': 'jack', 'T': '10',
  '9': '9', '8': '8', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2'
};

const suitToFilenamePart = {
  'S': 'spades', 'H': 'hearts', 'C': 'clubs', 'D': 'diamonds'
};

/**
 * 根据内部牌面表示获取图片文件名 (不含后缀)
 * @param {string} card - 例如 "AS", "TC"
 * @returns {string} - 例如 "ace_of_spades", "10_of_clubs"
 */
const getCardImageBasename = (card) => {
  if (!card || typeof card !== 'string' || card.length < 2) return 'back'; // 默认或错误牌显示背面

  const rank = card.slice(0, -1).toUpperCase();
  const suit = card.slice(-1).toUpperCase();

  const rankPart = rankToFilenamePart[rank];
  const suitPart = suitToFilenamePart[suit];

  if (rankPart && suitPart) {
    return `${rankPart}_of_${suitPart}`;
  }
  return 'back'; // 如果映射失败，显示背面
};

/**
 * 根据内部牌面表示获取图片完整路径 (后缀改为 .svg)
 * @param {string} card - 例如 "AS"
 * @returns {string} - 例如 "/cards/ace_of_spades.svg", "/cards/back.svg"
 */
export const getCardImageUrl = (card) => {
  const basename = getCardImageBasename(card);
  return `/cards/${basename}.svg`; // ***** 修改后缀为 .svg *****
};

// 辅助函数：排序手牌 (保持不变)
export const sortHandCards = (cards) => {
    if (!Array.isArray(cards)) return [];
    return [...cards].sort((a, b) => {
        const rankA = RANKS_ORDER.indexOf(a.slice(0, -1).toUpperCase());
        const rankB = RANKS_ORDER.indexOf(b.slice(0, -1).toUpperCase());
        if (rankA !== rankB) {
            return rankA - rankB;
        }
        const suitA = SUITS_CHAR.indexOf(a.slice(-1).toUpperCase());
        const suitB = SUITS_CHAR.indexOf(b.slice(-1).toUpperCase());
        return suitA - suitB;
    });
};
