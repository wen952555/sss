const SUITS = ['♥', '♠', '♦', '♣'];
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const JOKERS = {
  RED: 'Red Joker',
  BLACK: 'Black Joker',
};

// Map ranks to a value for sorting and comparison
const RANK_VALUES = {
  ...Object.fromEntries(RANKS.map((rank, i) => [rank, i + 3])),
  [JOKERS.BLACK]: 16,
  [JOKERS.RED]: 17,
};

class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
    this.value = RANK_VALUES[rank];
  }

  toString() {
    return this.suit ? `${this.suit}${this.rank}` : this.rank;
  }
}

class Deck {
  constructor() {
    this.cards = [];
    this.createDeck();
    this.shuffle();
  }

  createDeck() {
    // Standard 52 cards
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push(new Card(suit, rank));
      }
    }
    // Jokers
    this.cards.push(new Card(null, JOKERS.BLACK));
    this.cards.push(new Card(null, JOKERS.RED));
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(numPlayers, cardsPerPlayer) {
    const hands = Array(numPlayers).fill(null).map(() => []);
    for (let i = 0; i < cardsPerPlayer; i++) {
      for (let j = 0; j < numPlayers; j++) {
        if (this.cards.length > 0) {
          hands[j].push(this.cards.pop());
        }
      }
    }
    // The remaining cards are the community cards
    const communityCards = this.cards;
    return { hands, communityCards };
  }
}

module.exports = { Card, Deck, SUITS, RANKS, JOKERS, RANK_VALUES };
