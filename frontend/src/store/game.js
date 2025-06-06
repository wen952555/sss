import { defineStore } from 'pinia';
import api from '../services/api';
import router from '../router'; // 用于导航

export const useGameStore = defineStore('game', {
  state: () => ({
    gameId: localStorage.getItem('thirteen_gameId') || null,
    playerId: localStorage.getItem('thirteen_playerId') || null,
    playerName: localStorage.getItem('thirteen_playerName') || '玩家',
    gameState: null, // 从后端获取的完整游戏状态
    myHand: [], // 当前玩家手上的牌，也是逻辑上的“中墩”在摆牌完成时
    arrangedHand: { // 存储当前玩家已摆放的头墩和尾墩
      front: [],
      back: []
    },
    error: null, // 来自API的错误或客户端逻辑错误
    isLoading: false, // 全局加载状态，主要用于阻塞UI操作
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
    gameStatus: (state) => state.gameState?.status || 'loading', // 提供默认加载状态
    canDeal: (state) => {
        if (!state.gameState || !state.isHost) return false;
        return state.gameState.status === 'waiting_for_players' &&
               state.gameState.players.length === state.gameState.num_players &&
               state.gameState.players.every(p => p.connected === true);
    },
    canSubmitHand: (state) => { // 检查是否允许提交（基于游戏状态和玩家是否已提交）
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
          await this.fetchGameState(); // 创建后立即获取状态
          router.push(`/game/${this.gameId}`);
          this.startPolling(); // 开始轮询
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
          await this.fetchGameState(); // 加入后立即获取状态
          router.push(`/game/${this.gameId}`);
          this.startPolling(); // 开始轮询
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
      // 轮询时不显式设置 isLoading，避免界面闪烁
      try {
        const data = await api.getGameState(this.gameId);
        this.gameState = data; // 更新完整的游戏状态
        
        const me = this.currentPlayerData; // 使用 getter 获取最新的当前玩家数据

        if (me) {
            // 如果游戏处于摆牌阶段，且当前玩家未提交手牌
            if (data.status === 'arranging' && !me.submitted_hand) {
                const backendHandIsValid = me.hand && me.hand.length === 13 && me.hand.every(c => c.id && c.id !== 'back');
                
                let shouldSyncHandFromBackend = false;
                if (this.myHand.length === 0 && backendHandIsValid) { // 本地手牌为空，直接同步
                    shouldSyncHandFromBackend = true;
                } else if (backendHandIsValid) { // 本地有牌，比较是否为新发的牌
                    const localHandIds = this.myHand.map(c => c.id).sort().join(',');
                    const backendHandIds = me.hand.map(c => c.id).sort().join(',');
                    if (localHandIds !== backendHandIds) {
                        shouldSyncHandFromBackend = true;
                    }
                }

                if (shouldSyncHandFromBackend) {
                    this.myHand = [...me.hand]; // 从后端同步手牌到 myHand
                    this.arrangedHand.front = []; // 清空头尾墩，因为是新牌局开始或手牌变化
                    this.arrangedHand.back = [];
                    // console.log("Store: Synced myHand from backend on fetchGameState:", JSON.parse(JSON.stringify(this.myHand)));
                }
            }
            // 如果玩家已提交，或游戏不处于摆牌阶段，则不应再从后端覆盖本地的myHand/arrangedHand，
            // 因为 PlayerHand 组件此时不活跃，或显示的是已提交的结果。
        } else if (data.players && data.players.length > 0 && this.playerId && !me) {
             console.warn("Store: Current player ID not found in fetched game state players list. Session might be invalid.");
             // this.clearGameData(); // 可以考虑如果playerId无效则清理
             // router.push('/');
        }
        
        this.error = null; // 成功获取状态后清除之前的API错误
      } catch (err) {
        this.error = err.message || '获取游戏状态失败';
        if (this.error.includes("游戏不存在") || (err.response && err.response.status === 404)) {
          this.clearGameData(); // 如果游戏不存在，清理本地数据并导航
          router.push('/');
        }
      }
    },

    async dealCards() {
        if (!this.gameId || !this.isHost || !this.canDeal) {
            if (!this.error) { // 避免覆盖更具体的错误
                 this.error = "不满足发牌条件。";
                if(this.isHost && this.gameState?.status === 'waiting_for_players'){
                    if(this.gameState.players.length !== this.gameState.num_players){ this.error = "玩家未到齐，无法发牌。"; }
                    else if(!this.gameState.players.every(p => p.connected === true)){ this.error = "有玩家未连接，无法发牌。"; }
                }
            }
            return false; // 返回操作是否成功
        }
        this.isLoading = true;
        this.error = null;
        try {
            const response = await api.dealCards(this.gameId);
            if (response.success) {
                this.myHand = []; 
                this.arrangedHand = { front: [], back: [] };
                await this.fetchGameState(); // 发牌后立即获取最新状态
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

    async submitArrangedHandInternal(handToSubmit) { // 由 PlayerHand.vue 调用
        if (!this.gameId || !this.playerId || !this.canSubmitHand) {
            this.error = "当前无法提交牌型。";
            return false;
        }
        // 牌墩数量和牌张总数校验应在 PlayerHand.vue 完成
        this.isLoading = true;
        this.error = null;
        try {
            const response = await api.submitHand(this.gameId, this.playerId, handToSubmit);
            if (response.success) {
                await this.fetchGameState(); // 提交后刷新状态
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
        else { console.error("moveCard: Invalid source pile:", fromPileName); return false; }

        let targetPile;
        if (toPileName === 'myHand') targetPile = this.myHand;
        else if (this.arrangedHand[toPileName]) targetPile = this.arrangedHand[toPileName];
        else { console.error("moveCard: Invalid target pile:", toPileName); return false; }

        const pileLimitsInternal = { front: 3, back: 5, myHand: 13 };

        if (toPileName !== 'myHand' && targetPile.length >= pileLimitsInternal[toPileName]) {
            return false; // 目标墩已满
        }
        if (toPileName === 'myHand' && targetPile.length >= pileLimitsInternal.myHand && sourcePile !== targetPile) {
            return false; // 手牌区已满13张 (通常不应发生，因为牌是从手牌区出去的)
        }

        const removedCard = sourcePile.splice(cardIndexInFromPile, 1)[0];
        if (!removedCard || removedCard.id !== cardToMove.id) {
            // console.error("moveCard: Card ID mismatch or card not found at index.", { cardToMove, fromPileName, cardIndexInFromPile, removedCard });
            const fallbackIndex = sourcePile.findIndex(c => c.id === cardToMove.id);
            if (fallbackIndex !== -1) {
                sourcePile.splice(fallbackIndex, 1);
            } else {
                if (removedCard) sourcePile.splice(cardIndexInFromPile, 0, removedCard); // 尝试放回
                return false;
            }
        }
        
        targetPile.push(cardToMove); // 使用原始的 cardToMove 对象
        this.error = null;
        return true;
    },

    clearArrangedPilesForAuto() { // 用于自动摆牌/AI摆牌前，将牌都收回到 myHand
        const pilesToClear = ['front', 'back'];
        pilesToClear.forEach(pileName => {
            if (this.arrangedHand[pileName]) {
                while (this.arrangedHand[pileName].length > 0) {
                    const card = this.arrangedHand[pileName].pop(); // 从尾部取出，保证顺序
                    if (this.myHand.length < 13) {
                        this.myHand.unshift(card); // 加到 myHand 头部，保持一定顺序感
                    } else {
                        // console.warn("clearArrangedPilesForAuto: myHand is full (13 cards), cannot add card:", card.id);
                        break; 
                    }
                }
            }
        });
        // 确保myHand中的牌不重复并数量正确
        const uniqueCardsMap = new Map();
        this.myHand.forEach(card => uniqueCardsMap.set(card.id, card));
        this.myHand = Array.from(uniqueCardsMap.values());
        
        if (this.myHand.length > 13) {
            // console.error("clearArrangedPilesForAuto: myHand has more than 13 cards after clearing.");
            this.myHand = this.myHand.slice(0, 13); // 强制截断
        } else if (this.myHand.length < 13 && this.gameState?.status === 'arranging') {
            // 如果牌不够13张，可能意味着原始数据有问题或中途丢失，尝试从gameState恢复
            const me = this.currentPlayerData;
            if (me && me.hand && me.hand.length === 13) {
                 // console.warn("clearArrangedPilesForAuto: myHand had less than 13 cards, attempting to restore from gameState.hand");
                 // this.myHand = [...me.hand]; // 这个恢复可能过于激进，需要小心
            }
        }
    },

    async aiArrangeHand() {
        if (!this.gameId || !this.playerId) { this.error = "游戏或玩家信息无效。"; return false; }
        
        this.clearArrangedPilesForAuto(); // 确保所有牌都在myHand开始
        if (this.myHand.length !== 13) {
            this.error = "手牌数量不为13张，无法进行 AI 分牌。请刷新或重新发牌。";
            return false;
        }

        this.isLoading = true;
        this.error = null;
        const originalMyHandBeforeAi = [...this.myHand]; // 保存状态以便出错时还原

        try {
            const currentHandIds = this.myHand.map(card => card.id);
            const aiResult = await api.getAiArrangedHand(this.gameId, this.playerId, currentHandIds);

            if (aiResult.success && aiResult.arranged_hand) {
                const { front, middle, back } = aiResult.arranged_hand;
                // 基础验证
                if (front.length !== 3 || middle.length !== 5 || back.length !== 5) {
                    throw new Error("AI 返回的牌墩数量不正确。");
                }
                const allAiCardsSet = new Set([...front, ...middle, ...back]);
                if (allAiCardsSet.size !== 13) {
                    throw new Error("AI 返回的牌张总数不是13或有重复。");
                }
                const originalHandSet = new Set(currentHandIds);
                if (!Array.from(allAiCardsSet).every(cardId => originalHandSet.has(cardId))) {
                    throw new Error("AI 返回的牌张与玩家原手牌不符。");
                }
                
                const getCardObjById = (id) => originalMyHandBeforeAi.find(c => c.id === id);

                this.arrangedHand.front = front.map(getCardObjById).filter(Boolean);
                this.arrangedHand.back = back.map(getCardObjById).filter(Boolean);
                this.myHand = middle.map(getCardObjById).filter(Boolean); // AI的中墩牌放入myHand

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
            // 出错时，尝试恢复手牌到 AI 调用前的状态
            this.myHand = originalMyHandBeforeAi;
            this.arrangedHand.front = [];
            this.arrangedHand.back = [];
            return false;
        } finally {
            this.isLoading = false;
        }
    },

    startPolling() {
      this.stopPolling(); // 先停止旧的，确保只有一个轮询
      if (this.gameId) {
        this.fetchGameState(); // 立即获取一次
        this.pollingIntervalId = setInterval(() => {
          // 确保只在 GameRoom 页面轮询
          if (this.gameId && router.currentRoute.value.name === 'GameRoom') {
             this.fetchGameState();
          } else {
            this.stopPolling(); // 如果不在游戏房间页，则停止轮询
          }
        }, 2500); // 轮询间隔
      }
    },
    stopPolling() {
      if (this.pollingIntervalId) {
        clearInterval(this.pollingIntervalId);
        this.pollingIntervalId = null;
      }
    },

    clearGameData() { // 用于退出游戏或游戏ID无效时清理
      this.stopPolling();
      this.gameId = null;
      this.playerId = null;
      this.gameState = null;
      this.myHand = [];
      this.arrangedHand = { front: [], back: [] };
      this.error = null;
      localStorage.removeItem('thirteen_gameId');
      localStorage.removeItem('thirteen_playerId');
      // 保留 playerName
    },

    async leaveGame() {
        // 可选：通知后端玩家离开
        // await api.playerLeaving(this.gameId, this.playerId);
        this.clearGameData();
        router.push('/'); // 返回首页
    }
  }
});
