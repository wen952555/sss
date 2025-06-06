import { defineStore } from 'pinia';
import api from '../services/api';
import router from '../router';

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
      // middle 字段已不再由UI直接管理，其内容在 myHand 中
    },
    error: null, // 来自API的错误
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
    canSubmitHand: (state) => { // 这个getter检查游戏状态和玩家是否已提交过
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
        // const oldStatus = this.gameState?.status; // 可以用于比较状态变化
        this.gameState = data;
        
        const me = data.players.find(p => p.id === this.playerId);
        if (me) {
            // 当游戏处于摆牌阶段，且玩家未提交，且后端手牌数据有效时，同步手牌
            if (data.status === 'arranging' && !me.submitted_hand) {
                const backendHandIsValid = me.hand && me.hand.length === 13 && me.hand.every(c => c.id !== 'back');
                // 只有当本地手牌为空（刚发牌/加入）或与后端手牌ID列表不一致时才更新，避免覆盖用户正在整理的牌
                const localHandIds = this.myHand.map(c => c.id).sort().join(',');
                const backendHandIds = backendHandIsValid ? me.hand.map(c => c.id).sort().join(',') : '';

                if (backendHandIsValid && (this.myHand.length === 0 || localHandIds !== backendHandIds)) {
                    this.myHand = [...me.hand]; // 后端手牌填充到 myHand
                    this.arrangedHand.front = []; // 清空头尾墩
                    this.arrangedHand.back = [];
                }
            } else if (me.submitted_hand || data.status !== 'arranging') {
                // 如果玩家已提交，或游戏不处于摆牌阶段，理论上本地的 myHand 和 arrangedHand 应该反映最终提交或展示的状态
                // 这里可以根据需要决定是否清空，通常在轮到下一局或离开时清空
                // 为简单起见，让 PlayerHand.vue 在非摆牌阶段不显示，或显示后端返回的已提交牌型
            }
        }
        this.error = null; // 成功获取状态后清除旧错误
      } catch (err) {
        this.error = err.message || '获取游戏状态失败';
        if (err.message.includes("游戏不存在") || (err.response && err.response.status === 404)) {
          this.clearGameData(); // 清理无效的游戏数据
          router.push('/'); // 返回首页
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
                await this.fetchGameState(); // 后端会发牌，然后前端通过此函数更新
            } else {
                this.error = response.error || '发牌失败';
            }
        } catch (err) {
            this.error = err.message || '发牌时发生网络错误';
        } finally {
            this.isLoading = false;
        }
    },

    // 内部方法，由 PlayerHand.vue 的 submitHandWrapper 调用
    async submitArrangedHandInternal(handToSubmit) {
        if (!this.gameId || !this.playerId || !this.canSubmitHand) {
            this.error = "不满足提交条件或现在不能提交。"; // 这个错误也可能由组件设置
            return false; // 返回一个状态
        }
        // 牌数校验已在 PlayerHand.vue 的 submitHandWrapper 中完成

        this.isLoading = true;
        this.error = null;
        try {
            const response = await api.submitHand(this.gameId, this.playerId, handToSubmit);
            if (response.success) {
                await this.fetchGameState(); // 提交后刷新状态，显示结果或等待其他玩家
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
        else {
            console.error("moveCard: Invalid source pile name:", fromPileName);
            return false;
        }

        let targetPile;
        if (toPileName === 'myHand') targetPile = this.myHand;
        else if (this.arrangedHand[toPileName]) targetPile = this.arrangedHand[toPileName];
        else {
            console.error("moveCard: Invalid target pile name:", toPileName);
            return false;
        }

        const pileLimitsInternal = { front: 3, back: 5, myHand: 13 }; // myHand 是总上限

        // 检查目标墩是否已满 (如果目标不是 myHand)
        if (toPileName !== 'myHand' && targetPile.length >= pileLimitsInternal[toPileName]) {
            return false; // 移动失败，由组件处理错误提示
        }
        // 检查手牌区是否已满 (如果目标是 myHand)
        if (toPileName === 'myHand' && targetPile.length >= pileLimitsInternal.myHand && sourcePile !== targetPile) {
            return false;
        }


        // 从原牌堆移除
        const removedCard = sourcePile.splice(cardIndexInFromPile, 1)[0];

        // 验证移除的牌是否正确 (防御性编程)
        if (!removedCard || removedCard.id !== cardToMove.id) {
            console.error("moveCard: Card ID mismatch or card not found at index.", {cardToMove, fromPileName, cardIndexInFromPile, removedCard});
            // 尝试按ID查找并移除（如果索引不准）
            const fallbackIndex = sourcePile.findIndex(c => c.id === cardToMove.id);
            if (fallbackIndex !== -1) {
                sourcePile.splice(fallbackIndex, 1); // 移除成功
            } else {
                if (removedCard) sourcePile.splice(cardIndexInFromPile, 0, removedCard); // 尝试放回错误的牌
                return false; // 移除失败
            }
        }
        
        // 添加到目标牌堆 (通常是末尾)
        targetPile.push(cardToMove); // cardToMove 是原始对象，比 removedCard 更可靠
        this.error = null; // 清除可能存在的旧错误
        return true; // 表示移动成功
    },

    // 用于“智能整理”前，将头墩和尾墩的牌全部移回 myHand
    clearArrangedPilesForAuto() {
        const pilesToClear = ['front', 'back'];
        pilesToClear.forEach(pileName => {
            if (this.arrangedHand[pileName]) {
                while (this.arrangedHand[pileName].length > 0) {
                    const card = this.arrangedHand[pileName].pop();
                    // 检查myHand是否已满13张，理论上不应该，因为牌总是从myHand出去的
                    if (this.myHand.length < 13) {
                        this.myHand.push(card);
                    } else {
                        console.warn("clearArrangedPilesForAuto: myHand is full (13 cards), cannot add more from pile:", pileName);
                        // 这种情况下，被弹出的牌会丢失，需要更好的处理逻辑或确保不会发生
                        break; 
                    }
                }
            }
        });
        // 确保myHand中的牌不重复
        const uniqueCardIds = new Set();
        this.myHand = this.myHand.filter(card => {
            if (uniqueCardIds.has(card.id)) return false;
            uniqueCardIds.add(card.id);
            return true;
        });
        // 确保总牌数仍为13 (如果之前有丢失的牌，这里会体现)
        if (this.myHand.length > 13) {
            console.error("clearArrangedPilesForAuto: myHand has more than 13 cards after clearing piles.");
            this.myHand = this.myHand.slice(0, 13); // 截断
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
