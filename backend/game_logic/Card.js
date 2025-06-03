// backend/game_logic/Card.js
const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"];
const VALUE_MAP = { // 用于比较大小和一些牌型判断
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "jack": 11, "queen": 12, "king": 13, "ace": 14 // Ace 通常最大
};

class Card {
  constructor(suit, value) {
    this.suit = suit;
    this.value = value;
    this.rank = VALUE_MAP[value]; // 数值大小，用于比较
    this.id = `${value}_of_${suit}`; // 用于前端图片匹配
  }

  toString() {
    return `${this.value} of ${this.suit}`;
  }

  // 用于前端显示，将 SVG 文件名中的 '10' 转为 '10'，'jack' 转为 'J' 等 (如果需要更短的显示)
  get displayValue() {
    if (parseInt(this.value) >= 2 && parseInt(this.value) <= 10) return this.value;
    return this.value.charAt(0).toUpperCase(); // J, Q, K, A
  }

  get suitSymbol() {
    const symbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
    return symbols[this.suit];
  }
}

module.exports = { Card, SUITS, VALUES, VALUE_MAP };
