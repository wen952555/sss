// backend/game_logic/Deck.js
const { Card, SUITS, VALUES } = require('./Card');

class Deck {
  constructor(cards = freshDeck()) {
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
    return this.cards.splice(0, numberOfCards);
  }
}

function freshDeck() {
  return SUITS.flatMap(suit => {
    return VALUES.map(value => {
      return new Card(suit, value);
    });
  });
}

module.exports = Deck;
