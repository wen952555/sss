import { defineStore } from 'pinia';
import api from '../services/api';
import router from '../router';

export const useGameStore = defineStore('game', {
  state: () => ({
    gameId: localStorage.getItem('thirteen_gameId') || null,
    playerId: localStorage.getItem('thirteen_playerId') || null,
    playerName: localStorage.getItem('thirteen_playerName') || '玩家',
    gameState: null,
    myHand: [], // 主手牌区，拖拽目标，逻辑中墩
    arrangedHand: { // 头墩和尾墩，拖拽目标
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
                const localHandIds = this.myHand.map(c => c.id).sort().join(',');
                const backendHandIds = backendHandIsValid ? me.hand.map(c => c.id).sort().join(',') : '';

                // 只有在后端手牌有效，并且 (本地手牌为空 或 牌的内容发生变化时才更新，避免覆盖用户拖拽中的牌)
                if (backendHandIsValid && (this.myHand.length !== 13 || this.arrangedHand.front.length > 0 || this.arrangedHand.back.length > 0 || localHandIds !== backendHandIds) ) {
                    // 如果本地已有摆放的牌，但后端认为游戏仍在 arranging 且未提交，可能是异常情况或重新发牌
                    // 此时应该以服务器为准，重置本地摆牌
                    // console.log("Store: Fetch found new hand or reset needed. Syncing from backend.");
                    this.myHand = [...me.hand];
                    this.arrangedHand.front = [];
                    this.arrangedHand.back = [];
                }
            }
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
                 this.error = "不满足发牌条件。";
                if(this.isHost && this.gameState?.status === 'waiting_for_players'){
                    if(this.gameState.players.length !== this.gameState.num_players){ this.error = "玩家未到齐，无法发牌。"; }
                    else if(!this.gameState.players.every(p => p.connected === true)){ this.error = "有玩家未连接，无法发牌。"; }
                }
            }
            return false;
        }
        this.isLoading = true; this.error = null;
        try {
            const response = await api.dealCards(this.gameId);
            if (response.success) {
                this.myHand = []; this.arrangedHand = { front: [], back: [] };
                await this.fetchGameState(); return true;
            } else { this.error = response.error || '发牌失败'; return false; }
        } catch (err) { this.error = err.message || '发牌时发生网络错误'; return false; }
        finally { this.isLoading = false; }
    },

    // 由 PlayerHand.vue 调用，传入的是已经根据UI（包括拖拽）确定的三墩牌的ID列表
    async submitArrangedHandInternal(handToSubmit) {
        if (!this.gameId || !this.playerId || !this.canSubmitHand) {
            this.error = "当前无法提交牌型。"; return false;
        }
        this.isLoading = true; this.error = null;
        try {
            // 此时 handToSubmit = { front: [ids...], middle: [ids...], back: [ids...] }
            // middle 的数据来自 PlayerHand.vue 中的 myHandState
            const response = await api.submitHand(this.gameId, this.playerId, handToSubmit);
            if (response.success) {
                await this.fetchGameState(); return true;
            } else { this.error = response.error || '提交牌型失败'; return false; }
        } catch (err) { this.error = err.message || '提交牌型时发生网络错误'; return false; }
        finally { this.isLoading = false; }
    },

    // 这个 moveCard 方法在有了拖拽库后，主要用途可能减少，
    // 除非有非拖拽的逻辑需要精确移动一张牌（例如，非常复杂的自动摆牌步骤）
    // 如果 PlayerHand.vue 中的所有移动都通过 VueDraggableNext 的 v-model 更新了本地状态，
    // 并且在 onDragEndUpdateStore 中同步回 store，那么这个方法可能不再被 PlayerHand.vue 直接调用。
    // 但保留它以防万一，并确保它操作的是正确的数组。
    _moveCard_legacy(cardToMove, fromPileName, toPileName, cardIndexInFromPile) {
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

    // 用于“智能整理”或“AI分牌”前，将牌都收回到 myHand
    // VueDraggableNext 会通过 v-model 自动更新其绑定的本地数组，
    // 这个 action 是为了确保 store 的状态也被正确重置。
    clearArrangedPilesForAuto() {
        const cardsToReturnToMyHand = [];
        if (this.arrangedHand.front.length > 0) {
            cardsToReturnToMyHand.push(...this.arrangedHand.front);
            this.arrangedHand.front.length = 0; // 清空数组，v-model 会感知
        }
        if (this.arrangedHand.back.length > 0) {
            cardsToReturnToMyHand.push(...this.arrangedHand.back);
            this.arrangedHand.back.length = 0; // 清空数组
        }
        
        // 将所有收回的牌添加到 myHand，并确保不重复
        const currentMyHandIds = new Set(this.myHand.map(c => c.id));
        cardsToReturnToMyHand.forEach(card => {
            if (!currentMyHandIds.has(card.id)) { // 避免重复添加已在myHand的牌
                this.myHand.push(card);
                currentMyHandIds.add(card.id);
            }
        });
        // 如果 myHand 牌数超过13，说明逻辑有问题，需要修复或报警
        if (this.myHand.length > 13) {
            console.error("Store: clearArrangedPilesForAuto resulted in myHand having > 13 cards.");
            // 可能需要更复杂逻辑来决定保留哪些牌，或直接报错
            // 简单处理：截断，但这可能不是最佳方案
            // this.myHand.splice(13);
        }
    },

    async aiArrangeHand() {
        if (!this.gameId || !this.playerId) { this.error = "游戏或玩家信息无效。"; return false; }
        
        this.clearArrangedPilesForAuto(); // 确保所有牌都在myHand开始
        if (this.myHand.length !== 13) {
            this.error = "手牌数量不为13张，无法进行 AI 分牌。请刷新或重新发牌。";
            return false;
        }

        this.isLoading = true; this.error = null;
        const originalMyHandBeforeAi = [...this.myHand];

        try {
            const currentHandIds = this.myHand.map(card => card.id);
            const aiResult = await api.getAiArrangedHand(this.gameId, this.playerId, currentHandIds);

            if (aiResult.success && aiResult.arranged_hand) {
                const { front: front_ids, middle: middle_ids, back: back_ids } = aiResult.arranged_hand;
                // ... (验证逻辑同前，确保数量和牌张正确性) ...
                if (front_ids.length !== 3 || middle_ids.length !== 5 || back_ids.length !== 5 || new Set([...front_ids, ...middle_ids, ...back_ids]).size !== 13) {
                    throw new Error("AI 返回的牌墩数量或总数不正确。");
                }
                
                const getCardObjById = (id) => originalMyHandBeforeAi.find(c => c.id === id);

                // 直接更新 store 的状态，PlayerHand.vue 中的 watchers 会同步本地 v-model
                this.arrangedHand.front = front_ids.map(getCardObjById).filter(c => c !== undefined);
                this.arrangedHand.back = back_ids.map(getCardObjById).filter(c => c !== undefined);
                this.myHand = middle_ids.map(getCardObjById).filter(c => c !== undefined);

                if (this.arrangedHand.front.length !== 3 || this.myHand.length !== 5 || this.arrangedHand.back.length !== 5) {
                    throw new Error("AI分牌结果在前端应用时，最终牌墩数量不匹配。");
                }
                return true;
            } else {
                this.error = aiResult.error || "AI 分牌未能成功返回结果。";
                return false;
            }
        } catch (err) {
            this.error = err.message || "AI 分牌时发生系统错误。";
            this.myHand = originalMyHandBeforeAi; // 出错时，尝试恢复手牌
            this.arrangedHand.front = []; this.arrangedHand.back = [];
            return false;
        } finally { this.isLoading = false; }
    },

    startPolling() { /* ... (同前) ... */ },
    stopPolling() { /* ... (同前) ... */ },
    clearGameData() { /* ... (同前) ... */ },
    async leaveGame() { /* ... (同前) ... */ }
  }
});
