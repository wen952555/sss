// frontend/src/utils/cardUtils.js

// 卡牌点数和花色的映射，方便内部处理和与后端通信
export const RANKS_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const SUITS_CHAR = ['D', 'C', 'H', 'S']; // 方块, 梅花, 红桃, 黑桃 (按花色比较顺序，可选)

// 内部表示与图片文件名部分的映射
const rankToFilenamePart = {
  'A': 'ace', 'K': 'king', 'Q': 'queen', 'J': 'jack', 'T': '10',
  '9': '9', '8': '8', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2'
};

const suitToFilenamePart = {
  'S': 'spades', 'H': 'hearts', 'C': 'clubs', 'D': 'diamonds'
};

/**
 * 根据内部牌面表示获取图片文件名
 * @param {string} card - 例如 "AS" (黑桃A), "TC" (梅花10)
 * @returns {string} - 例如 "ace_of_spades.png", "10_of_clubs.png"
 */
export const getCardImageFilename = (card) => {
  if (!card || typeof card !== 'string' || card.length < 2) return 'back.png';

  const rank = card.slice(0, -1).toUpperCase(); // "T", "A", "K"
  const suit = card.slice(-1).toUpperCase();    // "S", "C"

  const rankPart = rankToFilenamePart[rank];
  const suitPart = suitToFilenamePart[suit];

  if (rankPart && suitPart) {
    return `${rankPart}_of_${suitPart}.png`;
  }
  return 'back.png'; // 如果映射失败，显示背面
};

/**
 * 根据内部牌面表示获取图片完整路径 (相对于 public 目录)
 * @param {string} card - 例如 "AS"
 * @returns {string} - 例如 "/cards/ace_of_spades.png"
 */
export const getCardImageUrl = (card) => {
  // Cloudflare Pages部署时，public目录下的文件可以直接通过 / 访问
  // process.env.PUBLIC_URL 在 build 后通常是空字符串或 '.'
  // 直接使用绝对路径 /cards/ 即可
  return `/cards/${getCardImageFilename(card)}`;
};

// 辅助函数：排序手牌 (示例，可以根据后端返回的顺序，或者按点数花色自定义)
// 十三水理牌时，用户通常希望按点数排序
export const sortHandCards = (cards) => {
    if (!Array.isArray(cards)) return [];
    return [...cards].sort((a, b) => {
        const rankA = RANKS_ORDER.indexOf(a.slice(0, -1).toUpperCase());
        const rankB = RANKS_ORDER.indexOf(b.slice(0, -1).toUpperCase());
        if (rankA !== rankB) {
            return rankA - rankB; // 点数升序
        }
        // 点数相同，按花色排序 (可选)
        const suitA = SUITS_CHAR.indexOf(a.slice(-1).toUpperCase());
        const suitB = SUITS_CHAR.indexOf(b.slice(-1).toUpperCase());
        return suitA - suitB;
    });
};
