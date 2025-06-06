import { defineStore } from 'pinia';
import type { GameState, Card, Player } from '@/types';
import { fetchInitialGameState } from '@/services/gameService';
import { shuffleDeck as localShuffle } from '@/utils/cardUtils'; // 本地洗牌工具

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    deck: [],
    players: [],
    currentPlayerId: null,
  }),
  getters: {
    getPlayerHand: (state) => (playerId: string): Card[] => {
      const player = state.players.find(p => p.id === playerId);
      return player ? player.hand : [];
    },
  },
  actions: {
    async initializeGame(numPlayers: number = 2) {
      try {
        const data = await fetchInitialGameState();
        this.deck = data.deck; // 后端返回的可能是已洗好的牌
      } catch (error) {
        console.error("Failed to initialize game from backend, using local deck.", error);
        // Fallback: 如果API调用失败，使用本地生成的牌
        const { createDeck } = await import('@/utils/cardUtils');
        this.deck = localShuffle(createDeck());
      }

      this.players = [];
      for (let i = 0; i < numPlayers; i++) {
        this.players.push({
          id: `player${i + 1}`,
          name: `Player ${i + 1}`,
          hand: [],
        });
      }
      this.dealCards();
    },
    dealCards() {
      if (!this.deck.length || !this.players.length) return;

      // 每人13张牌
      const cardsPerPlayer = 13;
      this.players.forEach(player => player.hand = []); // 清空手牌

      for (let i = 0; i < cardsPerPlayer; i++) {
        for (const player of this.players) {
          if (this.deck.length > 0) {
            const card = this.deck.pop();
            if (card) {
              player.hand.push(card);
            }
          }
        }
      }
      // 实际游戏中，发牌后牌堆会变化，这里简单处理
      console.log('Cards dealt:', this.players.map(p => ({name: p.name, hand: p.hand.length})));
    },
    // 未来可以添加理牌、比牌等action
  },
});
