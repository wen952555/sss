// frontend/src/store/game.js
// ... (import 和大部分 state, getters, actions 同前) ...

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
        // 必须是等待玩家状态，人数够，并且所有在 gameState.players 列表中的玩家都已连接
        return state.gameState.status === 'waiting_for_players' &&
               state.gameState.players.length === state.gameState.num_players &&
               state.gameState.players.every(p => p.connected === true); // 明确检查 connected 为 true
    },
    canSubmitHand: (state) => {
        if (!state.gameState || !state.currentPlayerData) return false;
        return state.gameState.status === 'arranging' && !state.currentPlayerData.submitted_hand;
    }
  },

  actions: {
    // ... (setPlayerName, createGame, joinGame - 同前) ...
    setPlayerName(name) { /* ... */ },
    async createGame(numPlayers) { /* ... */ },
    async joinGame(gameId) { /* ... */ },

    async fetchGameState() {
      if (!this.gameId) return;
      // isLoading 可以只在非轮询的主动操作时设置
      // if (!this.pollingIntervalId) this.isLoading = true;
      try {
        const data = await api.getGameState(this.gameId);
        const previousPlayerCount = this.gameState?.players?.length || 0;
        this.gameState = data; // 首先更新完整的 gameState
        
        const me = this.currentPlayerData; // 使用 getter 获取当前玩家数据

        if (me) {
            if (data.status === 'arranging' && !me.submitted_hand) {
                const backendHandIsValid = me.hand && me.hand.length === 13 && me.hand.every(c => c.id && c.id !== 'back');
                
                // 只有在后端手牌有效，并且 (本地手牌为空 或 牌的数量/内容发生变化时)才更新
                // 避免覆盖用户正在整理的牌，除非是新一轮发牌
                let shouldUpdateMyHand = false;
                if (this.myHand.length === 0 && backendHandIsValid) {
                    shouldUpdateMyHand = true;
                } else if (backendHandIsValid) {
                    // 如果后端手牌与本地手牌不同 (例如重新发牌)
                    const localHandIds = this.myHand.map(c => c.id).sort().join(',');
                    const backendHandIds = me.hand.map(c => c.id).sort().join(',');
                    if (localHandIds !== backendHandIds) {
                        shouldUpdateMyHand = true;
                    }
                }

                if (shouldUpdateMyHand) {
                    this.myHand = [...me.hand]; // 从后端同步手牌到 myHand
                    this.arrangedHand.front = []; // 清空头尾墩，因为是新牌
                    this.arrangedHand.back = [];
                    console.log("Store: Synced myHand from backend:", this.myHand);
                }
            } else if (data.status !== 'arranging') {
                // 如果不是摆牌阶段，且当前玩家未提交（例如，他错过了提交时间然后游戏结束了）
                // 或者已提交，则清空本地的可操作手牌，以防 PlayerHand 误显示
                // 但如果他是刚加入一个已结束的游戏，后端返回的 me.hand 可能是他上一局的牌，需要小心处理
                // 为安全起见，如果不是arranging状态，且后端没有给当前玩家发牌（me.hand为空或无效），则清空本地手牌
                if (!me.submitted_hand && (!me.hand || me.hand.length !== 13) && this.myHand.length > 0) {
                    // this.myHand = [];
                    // this.arrangedHand.front = [];
                    // this.arrangedHand.back = [];
                    // console.log("Store: Cleared myHand as game is not arranging and no valid hand from backend.");
                }
            }
        } else if (data.players && data.players.length > 0 && !me) {
            // 如果 gameState 中有玩家，但当前 playerId 找不到匹配，说明可能出错了
            console.warn("Store: Current player ID not found in game state players list.");
            // this.clearGameData(); // 可以考虑清理会话
            // router.push('/');
        }
        
        this.error = null;
      } catch (err) {
        this.error = err.message || '获取游戏状态失败';
        if (err.message.includes("游戏不存在") || (err.response && err.response.status === 404)) {
          this.clearGameData();
          router.push('/');
        }
      } finally {
        // if (!this.pollingIntervalId) this.isLoading = false;
      }
    },

    async dealCards() {
        if (!this.gameId || !this.isHost || !this.canDeal) { // 再次检查 canDeal
            this.error = "不满足发牌条件。";
            if(this.canDeal === false && this.isHost && this.gameState.status === 'waiting_for_players'){
                if(this.gameState.players.length !== this.gameState.num_players){
                     this.error = "玩家未到齐，无法发牌。";
                } else if(!this.gameState.players.every(p => p.connected === true)){
                     this.error = "有玩家未连接，无法发牌。";
                }
            }
            return false;
        }
        this.isLoading = true;
        this.error = null;
        try {
            const response = await api.dealCards(this.gameId);
            if (response.success) {
                // 后端发牌成功后，清空本地手牌和墩位，等待 fetchGameState 更新
                this.myHand = []; 
                this.arrangedHand = { front: [], back: [] };
                await this.fetchGameState(); // 立刻获取最新状态
                return true;
            } else {
                this.error = response.error || '发牌失败';
                return false;
            }
        } catch (err) {
            this.error = err.message || '发牌时发生网络错误';
            return false;
        } finally {
            this.isLoading = false;
        }
    },
    // ... (submitArrangedHandInternal, moveCard, clearArrangedPilesForAuto, aiArrangeHand, startPolling, stopPolling, clearGameData, leaveGame - 同前) ...
    async submitArrangedHandInternal(handToSubmit) { /* ... */ },
    moveCard(cardToMove, fromPileName, toPileName, cardIndexInFromPile) { /* ... */ },
    clearArrangedPilesForAuto() { /* ... */ },
    async aiArrangeHand() { /* ... */ },
    startPolling() { /* ... */ },
    stopPolling() { /* ... */ },
    clearGameData() { /* ... */ },
    async leaveGame() { /* ... */ }
  }
});
