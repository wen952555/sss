// frontend/src/game_logic_local/Card.js
const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"];
const VALUE_MAP = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "jack": 11, "queen": 12, "king": 13, "ace": 14
};

export class Card { // 使用 ES6 export
  constructor(suit, value) {
    if (!SUITS.includes(suit) || !VALUES.includes(value)) {
        throw new Error(`Invalid card: ${value} of ${suit}`);
    }
    this.suit = suit;
    this.value = value;
    this.rank = VALUE_MAP[value];
    this.id = `${value}_of_${suit}`; // 用于图片匹配和key
  }

  toString() {
    return `${this.value}_of_${this.suit}`;
  }

  get displayValue() {
    if (parseInt(this.value) >= 2 && parseInt(this.value) <= 10) return this.value;
    return this.value.charAt(0).toUpperCase();
  }

  get suitSymbol() {
    const symbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
    return symbols[this.suit];
  }
}

export { SUITS, VALUES, VALUE_MAP }; // 也导出这些常量
