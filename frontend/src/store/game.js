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
    arrangedHand: { front: [], back: [] },
    error: null,
    isLoading: false,
    pollingIntervalId: null,
    isAiArrangementActive: false, // 新增：标记AI分牌是否激活了前端的临时摆法
    originalHandBeforeAi: [], // 新增：存储AI分牌前的原始手牌对象
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
               state.gameState.players.every(p => p.connected === true);
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
      this.isLoading = true; this.error = null;
      try {
        const response = await api.createGame(this.playerName, numPlayers);
        if (response.success) {
          this.gameId = response.game_id; this.playerId = response.player_id;
          localStorage.setItem('thirteen_gameId', this.gameId);
          localStorage.setItem('thirteen_playerId', this.playerId);
          this.myHand = []; this.arrangedHand = { front: [], back: [] };
          this.isAiArrangementActive = false; this.originalHandBeforeAi = [];
          await this.fetchGameState();
          router.push(`/game/${this.gameId}`);
          this.startPolling();
        } else { this.error = response.error || '创建游戏失败'; }
      } catch (err) { this.error = err.message || '创建游戏时发生网络错误'; }
      finally { this.isLoading = false; }
    },

    async joinGame(gameId) {
      this.isLoading = true; this.error = null;
      try {
        const response = await api.joinGame(gameId, this.playerName);
        if (response.success) {
          this.gameId = response.game_id; this.playerId = response.player_id;
          localStorage.setItem('thirteen_gameId', this.gameId);
          localStorage.setItem('thirteen_playerId', this.playerId);
          this.myHand = []; this.arrangedHand = { front: [], back: [] };
          this.isAiArrangementActive = false; this.originalHandBeforeAi = [];
          await this.fetchGameState();
          router.push(`/game/${this.gameId}`);
          this.startPolling();
        } else { this.error = response.error || '加入游戏失败'; }
      } catch (err) { this.error = err.message || '加入游戏时发生网络错误'; }
      finally { this.isLoading = false; }
    },

    async fetchGameState() {
      if (!this.gameId) return;
      try {
        const data = await api.getGameState(this.gameId);
        this.gameState = data;
        const me = this.currentPlayerData;

        if (me) {
            if (data.status === 'arranging' && !me.submitted_hand) {
                const backendHandIsValid = me.hand && me.hand.length === 13 && me.hand.every(c => c.id && c.id !== 'back');
                
                if (!this.isAiArrangementActive) { // 关键：AI激活时，不从后端覆盖手牌
                    let shouldSyncHandFromBackend = false;
                    if (this.myHand.length === 0 && backendHandIsValid) {
                        shouldSyncHandFromBackend = true;
                    } else if (backendHandIsValid) {
                        const localHandIds = this.myHand.map(c => c.id).sort().join(',');
                        const backendHandIds = me.hand.map(c => c.id).sort().join(',');
                        if (localHandIds !== backendHandIds && this.arrangedHand.front.length === 0 && this.arrangedHand.back.length === 0) {
                            shouldSyncHandFromBackend = true;
                        }
                    }
                    if (shouldSyncHandFromBackend) {
                        this.myHand = [...me.hand];
                        this.arrangedHand.front = []; this.arrangedHand.back = [];
                    }
                }
            } else if (me.submitted_hand || data.status !== 'arranging') {
                 this.isAiArrangementActive = false; // 游戏状态推进或已提交，则AI摆法作废
            }
        } else if (data.players && data.players.length > 0 && this.playerId && !me) {
             console.warn("Store: Current player ID not found in game state players list.");
        }
        this.error = null;
      } catch (err) {
        this.error = err.message || '获取游戏状态失败';
        if (this.error.includes("游戏不存在")) { this.clearGameData(); router.push('/'); }
      }
    },

    async dealCards() {
        if (!this.gameId || !this.isHost || !this.canDeal) {
            if (!this.error) {
                if(!this.isHost) this.error = "只有房主可以开始游戏。";
                else if(this.gameState?.players.length !== this.gameState?.num_players) this.error = "玩家未到齐，无法发牌。";
                else if(this.gameState?.players && !this.gameState.players.every(p => p.connected === true)) this.error = "有玩家未连接，无法发牌。";
                else this.error = "不满足发牌条件。";
            }
            return false;
        }
        this.isLoading = true; this.error = null;
        try {
            const response = await api.dealCards(this.gameId);
            if (response.success) {
                this.myHand = []; this.arrangedHand = { front: [], back: [] };
                this.isAiArrangementActive = false; this.originalHandBeforeAi = [];
                await this.fetchGameState(); return true;
            } else { this.error = response.error || '发牌失败'; return false; }
        } catch (err) { this.error = err.message || '发牌时发生网络错误'; return false; }
        finally { this.isLoading = false; }
    },

    async submitArrangedHandInternal(handToSubmit) {
        if (!this.gameId || !this.playerId || !this.canSubmitHand) {
            this.error = "当前无法提交牌型。"; return false;
        }
        this.isLoading = true; this.error = null;
        try {
            const response = await api.submitHand(this.gameId, this.playerId, handToSubmit);
            if (response.success) {
                this.isAiArrangementActive = false; // 提交后AI摆法作废
                await this.fetchGameState(); return true;
            } else { this.error = response.error || '提交牌型失败'; return false; }
        } catch (err) { this.error = err.message || '提交牌型时发生网络错误'; return false; }
        finally { this.isLoading = false; }
    },

    moveCard(cardToMove, fromPileName, toPileName, cardIndexInFromPile) {
        if (this.isAiArrangementActive) { // 用户手动移牌，AI摆法失效
            this.isAiArrangementActive = false;
        }
        let sourcePile; if (fromPileName === 'myHand') sourcePile = this.myHand; else if (this.arrangedHand[fromPileName]) sourcePile = this.arrangedHand[fromPileName]; else return false;
        let targetPile; if (toPileName === 'myHand') targetPile = this.myHand; else if (this.arrangedHand[toPileName]) targetPile = this.arrangedHand[toPileName]; else return false;
        const pileLimitsInternal = { front: 3, back: 5, myHand: 13 };
        if (toPileName !== 'myHand' && targetPile.length >= pileLimitsInternal[toPileName]) return false;
        if (toPileName === 'myHand' && targetPile.length >= pileLimitsInternal.myHand && sourcePile !== targetPile) return false;
        const removedCard = sourcePile.splice(cardIndexInFromPile, 1)[0];
        if (!removedCard || removedCard.id !== cardToMove.id) {
            const fallbackIndex = sourcePile.findIndex(c => c.id === cardToMove.id);
            if (fallbackIndex !== -1) sourcePile.splice(fallbackIndex, 1);
            else { if (removedCard) sourcePile.splice(cardIndexInFromPile, 0, removedCard); return false; }
        }
        targetPile.push(cardToMove); this.error = null; return true;
    },

    clearArrangedPilesForAuto() {
        this.isAiArrangementActive = false; // 清理墩位也使AI摆法失效
        const pilesToClear = ['front', 'back'];
        pilesToClear.forEach(pileName => {
            if (this.arrangedHand[pileName]) {
                while (this.arrangedHand[pileName].length > 0) {
                    const card = this.arrangedHand[pileName].pop();
                    if (this.myHand.length < 13) this.myHand.unshift(card);
                    else break;
                }
            }
        });
        const uniqueCardsMap = new Map(); this.myHand.forEach(card => uniqueCardsMap.set(card.id, card));
        this.myHand = Array.from(uniqueCardsMap.values());
        if (this.myHand.length > 13) this.myHand = this.myHand.slice(0, 13);
    },

    async aiArrangeHand() {
        if (!this.gameId || !this.playerId) { this.error = "游戏或玩家信息无效。"; return false; }
        this.clearArrangedPilesForAuto(); // isAiArrangementActive 会在这里被设为 false
        if (this.myHand.length !== 13) {
            this.error = "手牌数量不为13张，无法进行 AI 分牌。请刷新或重新发牌。"; return false;
        }
        this.isLoading = true; this.error = null;
        this.originalHandBeforeAi = [...this.myHand]; // 保存的是对象数组

        try {
            const currentHandIds = this.myHand.map(card => card.id);
            const aiResult = await api.getAiArrangedHand(this.gameId, this.playerId, currentHandIds);

            if (aiResult.success && aiResult.arranged_hand) {
                const { front, middle, back } = aiResult.arranged_hand;
                if (front.length !== 3 || middle.length !== 5 || back.length !== 5 || new Set([...front, ...middle, ...back]).size !== 13) {
                    throw new Error("AI 返回的牌墩结构或数量不正确。");
                }
                const originalHandSet = new Set(currentHandIds);
                if (![...front, ...middle, ...back].every(cardId => originalHandSet.has(cardId))) {
                    throw new Error("AI 返回的牌张与玩家原手牌不符。");
                }
                
                const getCardObjById = (id) => this.originalHandBeforeAi.find(c => c.id === id);

                this.arrangedHand.front = front.map(getCardObjById).filter(Boolean);
                this.arrangedHand.back = back.map(getCardObjById).filter(Boolean);
                this.myHand = middle.map(getCardObjById).filter(Boolean);

                if (this.arrangedHand.front.length !== 3 || this.myHand.length !== 5 || this.arrangedHand.back.length !== 5) {
                    throw new Error("AI分牌结果在前端应用时，最终牌墩数量不匹配。");
                }
                this.isAiArrangementActive = true; // 标记AI分牌成功应用
                return true;
            } else {
                this.error = aiResult.error || "AI 分牌未能成功返回结果。";
                this.myHand = this.originalHandBeforeAi; this.arrangedHand.front = []; this.arrangedHand.back = [];
                // isAiArrangementActive 保持 false 或由 clearArrangedPilesForAuto 设置
                return false;
            }
        } catch (err) {
            this.error = err.message || "AI 分牌时发生系统错误。";
            this.myHand = this.originalHandBeforeAi; this.arrangedHand.front = []; this.arrangedHand.back = [];
            this.isAiArrangementActive = false;
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
      this.gameId = null; this.playerId = null; this.gameState = null;
      this.myHand = []; this.arrangedHand = { front: [], back: [] };
      this.error = null; this.isAiArrangementActive = false; this.originalHandBeforeAi = [];
      localStorage.removeItem('thirteen_gameId'); localStorage.removeItem('thirteen_playerId');
    },

    async leaveGame() {
        this.clearGameData(); // clearGameData 内部会重置 isAiArrangementActive
        router.push('/');
    }
  }
});
