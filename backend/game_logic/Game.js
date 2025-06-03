// backend/game_logic/Game.js
const Deck = require('./Deck');
const Player = require('./Player');

// 十三水牌型判断和比较逻辑非常复杂，这里只做最基础的框架
// TODO: 实现完整的牌型识别 (乌龙、对子、两对、三条、顺子、同花、葫芦、铁支、同花顺、五同、各种特殊牌型)
// TODO: 实现墩与墩之间的比较逻辑
// TODO: 实现计分逻辑

class Game {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = {}; // { socketId: PlayerInstance }
    this.deck = new Deck();
    this.gameState = 'waiting'; // waiting, dealing, playing, scoring, finished
    this.maxPlayers = 4; // 十三水通常2-4人
  }

  addPlayer(socketId, name) {
    if (Object.keys(this.players).length >= this.maxPlayers) {
      return { error: 'Room is full.' };
    }
    if (this.players[socketId]) {
      return { error: 'Player already in room.' };
    }
    const player = new Player(socketId, name);
    this.players[socketId] = player;
    return { player };
  }

  removePlayer(socketId) {
    delete this.players[socketId];
    if (Object.keys(this.players).length === 0) {
        // Can add logic to clean up empty rooms
    }
  }

  getPlayer(socketId) {
    return this.players[socketId];
  }

  getAllPlayersInfo() {
    return Object.values(this.players).map(p => ({
        id: p.id,
        name: p.name,
        isReady: p.isReady,
        // hand: p.hand, // Don't send full hand to others until showdown
        cardCount: p.hand.length,
        score: p.score
    }));
  }

  start() {
    if (Object.keys(this.players).length < 2) { // 至少需要2个玩家
      return { error: "Not enough players to start." };
    }
    this.gameState = 'dealing';
    this.deck = new Deck();
    this.deck.shuffle();

    Object.values(this.players).forEach(player => {
      player.setHand(this.deck.deal(13));
      player.isReady = false; // Reset ready state for arranging hands
    });
    this.gameState = 'playing'; // Players arrange their hands
    return { success: true };
  }

  // 玩家提交理好的牌
  submitHand(socketId, arrangedHand) {
    const player = this.getPlayer(socketId);
    if (!player) return { error: "Player not found."};
    if (this.gameState !== 'playing') return { error: "Game not in playing state."};

    // TODO: 深入验证 arrangedHand 的合法性 (数量, 牌是否来自原手牌, 墩的强度顺序)
    // 这里只做基本设置
    player.setArrangedHand(arrangedHand.front, arrangedHand.middle, arrangedHand.back);

    // 检查是否所有人都准备好了
    if (Object.values(this.players).every(p => p.isReady)) {
      this.gameState = 'scoring';
      this.calculateScores(); // TODO: Implement scoring
      this.gameState = 'finished'; // Or 'waiting' for next round
    }
    return { success: true, playerIsReady: player.isReady };
  }

  // 简化计分：仅示例，十三水计分非常复杂
  calculateScores() {
    console.log("Calculating scores... (TODO: Implement full scoring logic)");
    // 1. 比较每个玩家的头墩、中墩、尾墩
    // 2. 处理打枪、全垒打等特殊情况
    // 3. 累加分数
    // 示例：随机给点分
    Object.values(this.players).forEach(p => {
        p.score += Math.floor(Math.random() * 5) - 2; // Random score change
    });
  }

  getGameState() {
    return {
      roomId: this.roomId,
      gameState: this.gameState,
      players: this.getAllPlayersInfo(),
      // currentHands: (this.gameState === 'scoring' || this.gameState === 'finished')
      //     ? Object.fromEntries(Object.entries(this.players).map(([id, p]) => [id, p.arrangedHand]))
      //     : {}, // 只在比牌阶段显示所有人的牌
    };
  }
}

module.exports = Game;
