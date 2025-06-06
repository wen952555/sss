import { defineStore } from 'pinia';
import api from '../services/api';
import router from '../router'; // 用于导航

export const useGameStore = defineStore('game', {
  state: () => ({
    gameId: localStorage.getItem('thirteen_gameId') || null,
    playerId: localStorage.getItem('thirteen_playerId') || null,
    playerName: localStorage.getItem('thirteen_playerName') || '玩家',
    gameState: null,
    myHand: [], // 存储当前玩家手上的牌对象数组
    arrangedHand: { // 存储当前玩家已摆放的牌对象数组
      front: [],
      middle: [],
      back: []
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
               state.gameState.players.every(p => p.connected); // 所有人都连接才能发牌
    },
    canSubmitHand: (state) => { // 这个getter仅检查游戏状态和玩家是否已提交
        if (!state.gameState || !state.currentPlayerData) return false;
        // 只有在摆牌阶段且当前玩家未提交过手牌时才能提交
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
          // 创建后，清空本地手牌数据，等待 fetchGameState
          this.myHand = [];
          this.arrangedHand = { front: [], middle: [], back: [] };
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
          this.arrangedHand = { front: [], middle: [], back: [] };
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
      // this.isLoading = true; // 轮询时避免频繁loading
      try {
        const data = await api.getGameState(this.gameId);
        const oldStatus = this.gameState?.status;
        this.gameState = data;
        
        const me = data.players.find(p => p.id === this.playerId);
        if (me) {
            // 如果游戏状态是 'arranging' 且玩家未提交，并且本地手牌为空 (通常是刚发牌或刚加入)
            // 则用后端的手牌数据填充本地 myHand
            if (data.status === 'arranging' && !me.submitted_hand && this.myHand.length === 0 && me.hand && me.hand.length === 13) {
                // 确保后端返回的 hand 里的牌不是 'back.png'
                const validCards = me.hand.filter(card => card.id !== 'back' && card.suit !== 'unknown');
                if (validCards.length === 13) {
                    this.myHand = [...validCards];
                    // 如果刚发牌，清空已摆放的墩
                    this.arrangedHand = { front: [], middle: [], back: [] };
                }
            }
            // 如果游戏结束，或者从 arranging 变到其他状态，而之前手上有牌，则清空
            else if (oldStatus === 'arranging' && data.status !== 'arranging' && (this.myHand.length > 0 || Object.values(this.arrangedHand).some(p => p.length > 0))) {
                 if(!me.submitted_hand){ // 如果是因为自己没提交而结束，保留牌面让用户查看
                    // this.myHand = [];
                    // this.arrangedHand = { front: [], middle: [], back: [] };
                 }
            }
        }
        this.error = null; // 清除之前的API错误
      } catch (err) {
        this.error = err.message || '获取游戏状态失败';
        if (err.message.includes("游戏不存在") || (err.response && err.response.status === 404)) {
          this.clearGameData();
          router.push('/');
        }
      } finally {
        // this.isLoading = false;
      }
    },

    async dealCards() {
        if (!this.gameId || !this.isHost) return;
        this.isLoading = true;
        this.error = null;
        try {
            const response = await api.dealCards(this.gameId);
            if (response.success) {
                this.myHand = []; // 清空本地手牌
                this.arrangedHand = { front: [], middle: [], back: [] }; // 清空墩位
                await this.fetchGameState(); // 立刻获取新状态，后端会发牌
            } else {
                this.error = response.error || '发牌失败';
            }
        } catch (err) {
            this.error = err.message || '发牌时发生网络错误';
        } finally {
            this.isLoading = false;
        }
    },

    async submitArrangedHand() {
        if (!this.gameId || !this.playerId || !this.canSubmitHand) {
            this.error = "不满足提交条件或现在不能提交。";
            return;
        }
        if (this.arrangedHand.front.length !== 3 ||
            this.arrangedHand.middle.length !== 5 ||
            this.arrangedHand.back.length !== 5 ||
            this.myHand.length !== 0) {
            this.error = "牌墩数量不正确或手牌区还有牌，请按前3、中5、后5摆放完毕。";
            return;
        }

        this.isLoading = true;
        this.error = null;
        try {
            const handToSubmit = {
                front: this.arrangedHand.front.map(c => c.id),
                middle: this.arrangedHand.middle.map(c => c.id),
                back: this.arrangedHand.back.map(c => c.id),
            };
            const response = await api.submitHand(this.gameId, this.playerId, handToSubmit);
            if (response.success) {
                // 提交成功后，手牌和墩位由 fetchGameState 更新，或者可以不清空以便玩家查看自己提交的牌
                await this.fetchGameState();
            } else {
                this.error = response.error || '提交牌型失败';
            }
        } catch (err) {
            this.error = err.message || '提交牌型时发生网络错误';
        } finally {
            this.isLoading = false;
        }
    },

    moveCard(cardToMove, fromPileName, toPileName, cardIndexInFromPile) {
        let sourcePile;
        if (fromPileName === 'myHand') sourcePile = this.myHand;
        else if (this.arrangedHand[fromPileName]) sourcePile = this.arrangedHand[fromPileName];
        else return;

        let targetPile;
        if (toPileName === 'myHand') targetPile = this.myHand;
        else if (this.arrangedHand[toPileName]) targetPile = this.arrangedHand[toPileName];
        else return;

        const pileLimits = { front: 3, middle: 5, back: 5, myHand: 13 };

        // 检查目标牌墩是否已满 (如果目标不是 myHand)
        if (toPileName !== 'myHand' && targetPile.length >= pileLimits[toPileName]) {
            // this.error = `目标墩 (${toPileName}) 已满！`; // PlayerHand.vue 会处理这个错误提示
            // setTimeout(() => this.error = null, 2000);
            return false; // 表示移动失败
        }

        // 从原牌堆移除
        const foundCard = sourcePile.splice(cardIndexInFromPile, 1)[0];
        if (!foundCard || foundCard.id !== cardToMove.id) {
            // 如果没找到或者ID不匹配（理论上不应发生，因为index是准确的），尝试按ID找
            const fallbackIndex = sourcePile.findIndex(c => c.id === cardToMove.id);
            if (fallbackIndex !== -1) {
                sourcePile.splice(fallbackIndex, 1);
            } else {
                 // 牌未找到，放回原位（如果可能）或记录错误
                // console.error("moveCard: Card not found in source pile or ID mismatch");
                if(foundCard) sourcePile.splice(cardIndexInFromPile, 0, foundCard); // 尝试放回
                return false;
            }
        }
        
        // 添加到目标牌堆 (通常是末尾)
        targetPile.push(cardToMove);
        this.error = null; // 清除之前的错误
        return true; // 表示移动成功
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
        }, 2500); // 轮询间隔改为2.5秒
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
      this.arrangedHand = { front: [], middle: [], back: [] };
      this.error = null;
      localStorage.removeItem('thirteen_gameId');
      localStorage.removeItem('thirteen_playerId');
      // playerName 保留，方便下次使用
    },

    async leaveGame() {
        // 可选: 通知后端玩家离开，如果后端需要做相应处理
        // await api.leaveGame(this.gameId, this.playerId); // 假设有这个API
        this.clearGameData();
        router.push('/');
    }
  }
});
