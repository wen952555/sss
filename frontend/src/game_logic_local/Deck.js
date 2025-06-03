// frontend/src/game_logic_local/Deck.js
import { Card, SUITS, VALUES } from './Card'; // 使用 ES6 import

export default class Deck { // 使用 ES6 export default
  constructor(cards = Deck.freshDeck()) {
    this.cards = cards;
  }

  get numberOfCards() {
    return this.cards.length;
  }

  shuffle() {
    for (let i = this.numberOfCards - 1; i > 0; i--) {
      const newIndex = Math.floor(Math.random() * (i + 1));
      const oldValue = this.cards[newIndex];
      this.cards[newIndex] = this.cards[i];
      this.cards[i] = oldValue;
    }
  }

  deal(numberOfCards) {
    if (this.numberOfCards < numberOfCards) {
      console.error("Not enough cards to deal!");
      return [];
    }
    // splice 修改原数组并返回被删除的元素
    return this.cards.splice(0, numberOfCards);
  }

  static freshDeck() { // 改为静态方法，方便调用
    return SUITS.flatMap(suit => {
      return VALUES.map(value => {
        return new Card(suit, value);
      });
    });
  }
}
