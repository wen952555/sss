import { defineStore } from 'pinia';
import api from '../services/api';
import router from '../router'; // 用于导航

export const useGameStore = defineStore('game', {
  state: () => ({
    gameId: localStorage.getItem('thirteen_gameId') || null,
    playerId: localStorage.getItem('thirteen_playerId') || null,
    playerName: localStorage.getItem('thirteen_playerName') || '玩家',
    gameState: null, // 存储从后端获取的完整游戏状态
    myHand: [], // 当前玩家整理中的手牌 (前端状态)
    arrangedHand: { // 玩家整理好的三墩牌
      front: [],
      middle: [],
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
        return state.gameState.status === 'waiting_for_players' && state.gameState.players.length === state.gameState.num_players;
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
          await this.fetchGameState(); // 获取初始状态
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
      // this.isLoading = true; // 轮询时不要频繁设置loading，会闪烁
      // this.error = null;
      try {
        const data = await api.getGameState(this.gameId);
        this.gameState = data;
        // 更新自己的手牌 (如果后端有发)
        const me = data.players.find(p => p.id === this.playerId);
        if (me && me.hand && this.gameStatus === 'arranging' && !me.submitted_hand) {
             // 只有在摆牌阶段且未提交时，才从后端同步原始手牌到 myHand
             // 避免覆盖用户正在整理的牌
            if(this.myHand.length === 0 && me.hand.length === 13){
                 this.myHand = [...me.hand]; // 初始加载
            }
        }
      } catch (err) {
        this.error = err.message || '获取游戏状态失败';
        // if (err.message.includes("游戏不存在") || err.status === 404) {
        //   this.clearGameData();
        //   router.push('/');
        // }
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
                // 清空本地手牌，等待 fetchGameState 更新
                this.myHand = [];
                this.arrangedHand = { front: [], middle: [], back: [] };
                await this.fetchGameState(); // 立刻获取新状态
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
        if (!this.gameId || !this.playerId || !this.canSubmitHand) return;
        // 验证牌墩数量
        if (this.arrangedHand.front.length !== 3 ||
            this.arrangedHand.middle.length !== 5 ||
            this.arrangedHand.back.length !== 5) {
            this.error = "牌墩数量不正确 (前3, 中5, 后5)";
            return;
        }
        this.isLoading = true;
        this.error = null;
        try {
            // 从 arrangedHand 中提取 card_id
            const handToSubmit = {
                front: this.arrangedHand.front.map(c => c.id),
                middle: this.arrangedHand.middle.map(c => c.id),
                back: this.arrangedHand.back.map(c => c.id),
            };
            const response = await api.submitHand(this.gameId, this.playerId, handToSubmit);
            if (response.success) {
                await this.fetchGameState(); // 提交后立刻获取新状态
            } else {
                this.error = response.error || '提交牌型失败';
            }
        } catch (err) {
            this.error = err.message || '提交牌型时发生网络错误';
        } finally {
            this.isLoading = false;
        }
    },

    // 用于前端拖拽或点击移动牌的逻辑
    // card: 卡牌对象 {id, suit, rank}, targetPile: 'myHand', 'front', 'middle', 'back'
    moveCard(card, fromPileName, toPileName, fromIndex = -1) {
        // 1. 从原牌堆移除
        let sourcePile;
        if (fromPileName === 'myHand') sourcePile = this.myHand;
        else if (this.arrangedHand[fromPileName]) sourcePile = this.arrangedHand[fromPileName];
        else return; // 无效来源

        const cardToRemove = (fromIndex !== -1) ? sourcePile.splice(fromIndex, 1)[0] : sourcePile.find((c,i) => {
            if(c.id === card.id) {
                sourcePile.splice(i,1);
                return true;
            }
            return false;
        });

        if (!cardToRemove) return; // 没找到牌

        // 2. 添加到目标牌堆
        let targetPile;
        if (toPileName === 'myHand') targetPile = this.myHand;
        else if (this.arrangedHand[toPileName]) targetPile = this.arrangedHand[toPileName];
        else return; // 无效目标

        // 检查目标牌墩是否已满
        const pileLimits = { front: 3, middle: 5, back: 5, myHand: 13 };
        if (targetPile.length >= pileLimits[toPileName]) {
            // 目标牌堆已满，将牌放回原处 (或myHand)
            sourcePile.splice(fromIndex !== -1 ? fromIndex : 0, 0, cardToRemove); // 尝试放回原位
            this.error = `目标墩 (${toPileName}) 已满！`;
            setTimeout(() => this.error = null, 3000);
            return;
        }
        targetPile.push(cardToRemove);
    },

    // 轮询
    startPolling() {
      this.stopPolling(); //确保只有一个轮询
      if (this.gameId) {
        this.fetchGameState(); // 立即获取一次
        this.pollingIntervalId = setInterval(() => {
          if (this.gameId && router.currentRoute.value.path.startsWith('/game/')) { //只在游戏页面轮询
             this.fetchGameState();
          } else {
            this.stopPolling(); // 不在游戏页则停止
          }
        }, 3000); // 每3秒轮询一次
      }
    },
    stopPolling() {
      if (this.pollingIntervalId) {
        clearInterval(this.pollingIntervalId);
        this.pollingIntervalId = null;
      }
    },

    // 清理游戏数据 (例如退出游戏或游戏结束)
    clearGameData() {
      this.stopPolling();
      this.gameId = null;
      this.playerId = null;
      this.gameState = null;
      this.myHand = [];
      this.arrangedHand = { front: [], middle: [], back: [] };
      localStorage.removeItem('thirteen_gameId');
      localStorage.removeItem('thirteen_playerId');
    },

    async leaveGame() {
        // 可选：通知后端玩家离开 (如果后端需要处理断线/离开逻辑)
        this.clearGameData();
        router.push('/');
    }
  }
});
