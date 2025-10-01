// server/gameLogic.js

const SUITS = ["spades", "hearts", "diamonds", "clubs"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

/**
 * 创建一副标准的52张扑克牌
 * @returns {Array<Object>} deck - 一副牌
 */
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * Fisher-Yates (aka Knuth) 洗牌算法
 * @param {Array<Object>} deck - 要洗的牌堆
 * @returns {Array<Object>} - 洗好的牌堆
 */
function shuffleDeck(deck) {
  let currentIndex = deck.length, randomIndex;

  // 当还剩下元素可以洗时
  while (currentIndex !== 0) {
    // 随机选择一个剩下的元素
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // 将它与当前元素交换
    [deck[currentIndex], deck[randomIndex]] = [
      deck[randomIndex], deck[currentIndex]];
  }

  return deck;
}

/**
 * 发牌给四位玩家
 * @returns {Object} - 包含四个玩家手牌的对象
 */
function dealCards() {
    const deck = createDeck();
    const shuffledDeck = shuffleDeck(deck);

    const players = {
        player1: shuffledDeck.slice(0, 13),
        player2: shuffledDeck.slice(13, 26),
        player3: shuffledDeck.slice(26, 39),
        player4: shuffledDeck.slice(39, 52),
    };
    return players;
}

module.exports = { dealCards };
