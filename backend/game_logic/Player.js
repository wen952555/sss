// backend/game_logic/Player.js
class Player {
  constructor(id, name) {
    this.id = id; // socket.id
    this.name = name || `Player_${id.substring(0, 5)}`;
    this.hand = [];
    this.arrangedHand = { front: [], middle: [], back: [] }; // { front: [card1, card2, card3], middle: [...], back: [...] }
    this.isReady = false;
    this.score = 0;
  }

  setHand(cards) {
    this.hand = cards.sort((a, b) => a.rank - b.rank || SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit)); // 简单排序
  }

  // 简化版：这里不实现复杂的牌型判断和自动理牌
  // 实际项目中，这里会有复杂的牌型分析和比较逻辑
  setArrangedHand(front, middle, back) {
    // TODO: Validate hand arrangement (e.g., front must have 3, middle 5, back 5)
    // TODO: Validate hand strength (front <= middle <= back) - CRITICAL for 13 cards
    this.arrangedHand = { front, middle, back };
    this.isReady = true;
  }
}

module.exports = Player;
