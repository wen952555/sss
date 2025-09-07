const { Deck } = require('./data');

class GameRoom {
  constructor(players) {
    this.players = players; // Expects an array of { id: socket.id, socket: socket }
    this.deck = new Deck();
    this.communityCards = [];
    this.turn = null;
    this.lastHand = null;

    console.log(`GameRoom created for players: ${players.map(p => p.id).join(', ')}`);
  }

  startGame() {
    // Deal cards
    const { hands, communityCards } = this.deck.deal(this.players.length, 17);
    this.communityCards = communityCards;

    // Assign hands and emit to each player
    this.players.forEach((player, index) => {
      player.hand = hands[index].sort((a, b) => a.value - b.value); // Sort hand by value
      player.socket.emit('hand', player.hand);
      console.log(`Dealt ${player.hand.length} cards to ${player.id}`);
    });

    console.log(`Community cards (${this.communityCards.length}) are set.`);

    // For now, randomly select first player to act (e.g., to bid for landlord)
    // In real Dou Di Zhu, it's more complex.
    this.turn = this.players[Math.floor(Math.random() * this.players.length)].id;

    // Announce game start and who's turn it is
    this.players.forEach(p => {
        p.socket.emit('gameStart', { turn: this.turn });
    });

    console.log(`Game started. It's ${this.turn}'s turn.`);
  }
}

module.exports = { GameRoom };
