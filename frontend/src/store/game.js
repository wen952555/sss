// frontend/src/store/game.js
import { defineStore } from 'pinia';
import api from '../services/api';
import router from '../router';

export const useGameStore = defineStore('game', {
  state: () => ({
    gameId: localStorage.getItem('thirteen_gameId') || null,
    playerId: localStorage.getItem('thirteen_playerId') || null,
    playerName: localStorage.getItem('thirteen_playerName') || '玩家',
    gameState: null,
    myHand: [],
    arrangedHand: {
      front: [],
      back: []
    },
    error: null,
    isLoading: false,
    pollingIntervalId: null,
  }),

  getters: {
    isGameActive: (state) => !!state.gameId && !!state.gameState,
    currentPlayerData: (state) => {
      if (!state.gameState || !state.gameState.players || !state.playerId) return null;
      return state.gameState.players.find(p => p.id === state.playerId);
    },
    isHost: (state) => {
      const player = state.currentPlayerData;
      return player ? player.is_host : false;
    },
    gameStatus: (state) => state.gameState?.status || 'loading',
    canDeal: (state) => {
        if (!state.gameState || !state.isHost) return false;
        return state.gameState.status === 'waiting_for_players' &&
               state.gameState.players.length === state.gameState.num_players &&
               state.gameState.players.every(p => p.connected);
    },
    canSubmitHand: (state) => {
        if (!state.gameState || !state.currentPlayerData) return false;
        return state.gameState.status === 'arranging' && !state.currentPlayerData.submitted_hand;
    }
  },

  actions: {
    setPlayerName(name) {
      this.playerName = name;
      localStorage.setItem('thirteen_playerName', name);
    },

    async createGame(numPlayers) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await api.createGame(this.playerName, numPlayers);
        if (response.success) {
          this.gameId = response.game_id;
          this.playerId = response.player_id;
          localStorage.setItem('thirteen_gameId', this.gameId);
          localStorage.setItem('thirteen_playerId', this.playerId);
          this.myHand = [];
          this.arrangedHand = { front: [], back: [] };
          await this.fetchGameState();
          router.push(`/game/${this.gameId}`);
          this.startPolling();
        } else {
          this.error = response.error || '创建游戏失败';
        }
      } catch (err) {
        this.error = err.message || '创建游戏时发生网络错误';
      } finally {
        this.isLoading = false;
      }
    },

    async joinGame(gameId) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await api.joinGame(gameId, this.playerName);
        if (response.success) {
          this.gameId = response.game_id;
          this.playerId = response.player_id;
          localStorage.setItem('thirteen_gameId', this.gameId);
          localStorage.setItem('thirteen_playerId', this.playerId);
          this.myHand = [];
          this.arrangedHand = { front: [], back: [] };
          await this.fetchGameState();
          router.push(`/game/${this.gameId}`);
          this.startPolling();
        } else {
          this.error = response.error || '加入游戏失败';
        }
      } catch (err) {
        this.error = err.message || '加入游戏时发生网络错误';
      } finally {
        this.isLoading = false;
      }
    },

    async fetchGameState() {
      if (!this.gameId) return;
      try {
        const data = await api.getGameState(this.gameId);
        this.gameState = data;
        
        const me = data.players.find(p => p.id === this.playerId);
        if (me) {
            if (data.status === 'arranging' && !me.submitted_hand) {
                const backendHandIsValid = me.hand && me.hand.length === 13 && me.hand.every(c => c.id !== 'back');
                const localHandIds = this.myHand.map(c => c.id).sort().join(',');
                const backendHandIds = backendHandIsValid ? me.hand.map(c => c.id).sort().join(',') : '';

                if (backendHandIsValid && (this.myHand.length === 0 || localHandIds !== backendHandIds)) {
                    this.myHand = [...me.hand];
                    this.arrangedHand.front = [];
                    this.arrangedHand.back = [];
                }
            }
        }
        this.error = null;
      } catch (err) {
        this.error = err.message || '获取游戏状态失败';
        if (err.message.includes("游戏不存在") || (err.response && err.response.status === 404)) {
          this.clearGameData();
          router.push('/');
        }
      }
    },

    async dealCards() {
        if (!this.gameId || !this.isHost) return;
        this.isLoading = true;
        this.error = null;
        try {
            const response = await api.dealCards(this.gameId);
            if (response.success) {
                this.myHand = []; 
                this.arrangedHand = { front: [], back: [] };
                await this.fetchGameState(); 
            } else {
                this.error = response.error || '发牌失败';
            }
        } catch (err) {
            this.error = err.message || '发牌时发生网络错误';
        } finally {
            this.isLoading = false;
        }
    },

    async submitArrangedHandInternal(handToSubmit) {
        if (!this.gameId || !this.playerId || !this.canSubmitHand) {
            this.error = "不满足提交条件或现在不能提交。";
            return false;
        }
        this.isLoading = true;
        this.error = null;
        try {
            const response = await api.submitHand(this.gameId, this.playerId, handToSubmit);
            if (response.success) {
                await this.fetchGameState();
                return true;
            } else {
                this.error = response.error || '提交牌型失败';
                return false;
            }
        } catch (err) {
            this.error = err.message || '提交牌型时发生网络错误';
            return false;
        } finally {
            this.isLoading = false;
        }
    },

    moveCard(cardToMove, fromPileName, toPileName, cardIndexInFromPile) {
        let sourcePile;
        if (fromPileName === 'myHand') sourcePile = this.myHand;
        else if (this.arrangedHand[fromPileName]) sourcePile = this.arrangedHand[fromPileName];
        else { return false; }

        let targetPile;
        if (toPileName === 'myHand') targetPile = this.myHand;
        else if (this.arrangedHand[toPileName]) targetPile = this.arrangedHand[toPileName];
        else { return false; }

        const pileLimitsInternal = { front: 3, back: 5, myHand: 13 };

        if (toPileName !== 'myHand' && targetPile.length >= pileLimitsInternal[toPileName]) {
            return false;
        }
        if (toPileName === 'myHand' && targetPile.length >= pileLimitsInternal.myHand && sourcePile !== targetPile) {
            return false;
        }

        const removedCard = sourcePile.splice(cardIndexInFromPile, 1)[0];
        if (!removedCard || removedCard.id !== cardToMove.id) {
            const fallbackIndex = sourcePile.findIndex(c => c.id === cardToMove.id);
            if (fallbackIndex !== -1) { sourcePile.splice(fallbackIndex, 1); }
            else { if (removedCard) sourcePile.splice(cardIndexInFromPile, 0, removedCard); return false; }
        }
        
        targetPile.push(cardToMove);
        this.error = null;
        return true;
    },

    clearArrangedPilesForAuto() {
        const pilesToClear = ['front', 'back'];
        pilesToClear.forEach(pileName => {
            if (this.arrangedHand[pileName]) {
                while (this.arrangedHand[pileName].length > 0) {
                    const card = this.arrangedHand[pileName].pop();
                    if (this.myHand.length < 13) { this.myHand.push(card); }
                    else { break; }
                }
            }
        });
        const uniqueCardIds = new Set();
        this.myHand = this.myHand.filter(card => {
            if (uniqueCardIds.has(card.id)) return false;
            uniqueCardIds.add(card.id);
            return true;
        });
        if (this.myHand.length > 13) { this.myHand = this.myHand.slice(0, 13); }
    },

    async aiArrangeHand() {
        if (!this.gameId || !this.playerId || this.myHand.length !== 13) {
            this.error = "手牌不完整，无法进行 AI 分牌。";
            return false;
        }
        this.clearArrangedPilesForAuto();
        if (this.myHand.length !== 13) {
            this.error = "清理墩位后手牌数量不正确，请重试。";
            return false;
        }

        this.isLoading = true;
        this.error = null;
        const originalMyHandBeforeAi = [...this.myHand]; // 保存调用AI前的状态

        try {
            const currentHandIds = this.myHand.map(card => card.id);
            const aiResult = await api.getAiArrangedHand(this.gameId, this.playerId, currentHandIds);

            if (aiResult.success && aiResult.arranged_hand) {
                const { front, middle, back } = aiResult.arranged_hand;
                if (front.length !== 3 || middle.length !== 5 || back.length !== 5) {
                    throw new Error("AI 返回的牌墩数量不正确。");
                }
                const allAiCards = [...front, ...middle, ...back];
                if (new Set(allAiCards).size !== 13) {
                    throw new Error("AI 返回的牌张总数或有重复。");
                }
                const originalHandSet = new Set(currentHandIds);
                if (!allAiCards.every(cardId => originalHandSet.has(cardId))) {
                    throw new Error("AI 返回的牌张与玩家原手牌不符。");
                }
                
                // 用ID从原始手牌（调用AI前）中查找完整的卡牌对象
                const getCardObjById = (id) => originalMyHandBeforeAi.find(c => c.id === id);

                this.arrangedHand.front = front.map(getCardObjById).filter(Boolean);
                this.arrangedHand.back = back.map(getCardObjById).filter(Boolean);
                this.myHand = middle.map(getCardObjById).filter(Boolean);

                if (this.arrangedHand.front.length !== 3 || this.myHand.length !== 5 || this.arrangedHand.back.length !== 5) {
                    console.error("AI分牌后，前端应用牌墩数量不匹配", this.arrangedHand.front, this.myHand, this.arrangedHand.back);
                    this.myHand = originalMyHandBeforeAi; // 还原
                    this.arrangedHand.front = [];
                    this.arrangedHand.back = [];
                    throw new Error("AI分牌结果在前端应用时出错。");
                }
                return true;
            } else {
                this.error = aiResult.error || "AI 分牌未能成功返回结果。";
                this.myHand = originalMyHandBeforeAi; // AI失败，还原手牌
                return false;
            }
        } catch (err) {
            this.error = err.message || "AI 分牌时发生网络或逻辑错误。";
            this.myHand = originalMyHandBeforeAi; // 出错，还原手牌
            this.arrangedHand.front = []; // 清空可能被部分修改的墩
            this.arrangedHand.back = [];
            return false;
        } finally {
            this.isLoading = false;
        }
    },

    startPolling() {
      this.stopPolling();
      if (this.gameId) {
        this.fetchGameState();
        this.pollingIntervalId = setInterval(() => {
          if (this.gameId && router.currentRoute.value.name === 'GameRoom') {
             this.fetchGameState();
          } else {
            this.stopPolling();
          }
        }, 2500);
      }
    },
    stopPolling() {
      if (this.pollingIntervalId) {
        clearInterval(this.pollingIntervalId);
        this.pollingIntervalId = null;
      }
    },

    clearGameData() {
      this.stopPolling();
      this.gameId = null;
      this.playerId = null;
      this.gameState = null;
      this.myHand = [];
      this.arrangedHand = { front: [], back: [] };
      this.error = null;
      localStorage.removeItem('thirteen_gameId');
      localStorage.removeItem('thirteen_playerId');
    },

    async leaveGame() {
        this.clearGameData();
        router.push('/');
    }
  }
});
