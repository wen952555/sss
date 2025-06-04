// frontend/src/stores/gameStore.js
import { defineStore } from 'pinia';
import apiService from '../services/apiService';

export const useGameStore = defineStore('game', {
    state: () => ({
        gameId: localStorage.getItem('currentGameId') || null,
        gameCode: localStorage.getItem('currentGameCode') || null,
        gameState: null, // 后端返回的 games 表信息 (例如: { id, game_code, status, num_players, max_players, ... })
        players: [],     // 后端返回的玩家列表 (例如: [{ id, name, order, is_me, is_ready, score, ... }])
        myCards: [],
        myPlayerId: null, // 当前玩家在 players 表中的 ID (通过 is_me 找到)
        playerSessionId: localStorage.getItem('playerSessionId') || null,
        error: null,
        loading: false,
        pollingInterval: null,
        lastPollFailed: false,
    }),
    getters: {
        isGameActive: (state) => !!state.gameId && state.gameState && state.gameState.status !== 'finished',
        myPlayerDetails: (state) => state.players.find(p => p.is_me === true), // 明确检查 is_me
        
        // 核心：判断是否可以开始游戏
        canStartGame(state) {
            if (!this.myPlayerDetails) { // 如果无法识别当前玩家，则不能开始
                // console.warn("canStartGame: myPlayerDetails is undefined");
                return false;
            }
            if (!state.gameState || state.gameState.status !== 'waiting') {
                // console.warn("canStartGame: game not in waiting state or gameState undefined", state.gameState?.status);
                return false;
            }
            if (state.players.length < 2) { // 至少需要2名玩家
                // console.warn("canStartGame: not enough players", state.players.length);
                return false;
            }

            // 假设 order 为 1 的玩家是房主，并且只有房主可以开始游戏
            // 同时，确保玩家数量在允许范围内（虽然 start_game API 也会检查）
            const isHost = this.myPlayerDetails.order === 1;
            const enoughPlayers = state.players.length >= 2 && state.players.length <= state.gameState.max_players;
            
            // console.log(`canStartGame check: isHost=${isHost}, enoughPlayers=${enoughPlayers}, myOrder=${this.myPlayerDetails.order}, totalPlayers=${state.players.length}, maxPlayers=${state.gameState.max_players}`);
            return isHost && enoughPlayers;
        },

        isMyTurnToSubmit: (state) => {
            if (!state.isGameActive || state.gameState?.status !== 'playing' || !state.myPlayerDetails) return false;
            return !state.myPlayerDetails.is_ready;
        },
        allPlayersReady: (state) => {
            if (!state.players.length || state.gameState?.status !== 'playing') return false;
            return state.players.every(p => p.is_ready);
        },
    },
    actions: {
        _updateStateFromResponse(data) {
            if (data.game_id) {
                this.gameId = data.game_id;
                localStorage.setItem('currentGameId', this.gameId);
            }
            if (data.game_code) {
                this.gameCode = data.game_code;
                localStorage.setItem('currentGameCode', this.gameCode);
            }
            if (data.player_session_id && (!this.playerSessionId || this.playerSessionId !== data.player_session_id)) {
                this.playerSessionId = data.player_session_id;
                localStorage.setItem('playerSessionId', this.playerSessionId);
            }
            if (data.game_state) this.gameState = data.game_state;
            if (data.players) {
                this.players = data.players.map(p => ({ ...p, is_me: p.session_id === this.playerSessionId })); // 确保 is_me 正确设置
                const me = this.players.find(p => p.is_me);
                if (me) {
                    this.myCards = me.my_cards || [];
                    this.myPlayerId = me.id;
                } else { // 如果在players里找不到自己，可能意味着会话ID不匹配或数据问题
                    this.myCards = [];
                    this.myPlayerId = null;
                }
            }
        },
        async createGame(maxPlayers = 4) {
            this.loading = true; this.error = null;
            try {
                const response = await apiService.createGame(maxPlayers);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data);
                    // 确保 playerName 传递正确
                    const defaultPlayerName = localStorage.getItem('playerName') || `房主_${this.playerSessionId?.substring(0,4) || '玩家'}`;
                    await this.joinGame(this.gameCode, defaultPlayerName);
                } else {
                    this.error = response.data.error || '创建房间失败';
                    this.clearGameData();
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '创建房间请求错误';
                this.clearGameData();
            } finally {
                this.loading = false;
            }
        },
        async joinGame(gameCode, playerName) {
            this.loading = true; this.error = null;
            try {
                const response = await apiService.joinGame(gameCode, playerName);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data);
                    this.gameCode = gameCode; 
                    localStorage.setItem('currentGameCode', this.gameCode);
                    await this.fetchGameState(true);
                    this.startPolling();
                } else {
                    this.error = response.data.error || '加入房间失败';
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '加入房间请求错误';
            } finally {
                this.loading = false;
            }
        },
        async startGame() {
            if (!this.gameId || !this.canStartGame) { // 增加对canStartGame的检查
                this.error = "不满足开始游戏条件或权限不足。";
                return;
            }
            this.loading = true; this.error = null;
            try {
                const response = await apiService.startGame(this.gameId);
                if (response.data.success) {
                    // 后端会将游戏状态变为 'playing' 并发牌
                    // fetchGameState 会更新 myCards 和 gameState.status
                    await this.fetchGameState(true);
                } else {
                    this.error = response.data.error || '开始游戏失败';
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '开始游戏请求错误';
            } finally {
                this.loading = false;
            }
        },
        async fetchGameState(forceUpdateLoading = false) {
            if (!this.gameId) {
                 this.clearGameData();
                 return;
            }
            if (forceUpdateLoading) this.loading = true;
            try {
                const response = await apiService.getGameState(this.gameId);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data);
                    this.error = null; 
                    this.lastPollFailed = false;
                    if (this.gameState?.status === 'finished') {
                        this.stopPolling();
                    }
                } else {
                    this.error = response.data.error || '获取游戏状态失败';
                    this.lastPollFailed = true;
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '获取游戏状态请求错误';
                this.lastPollFailed = true;
            } finally {
                if (forceUpdateLoading) this.loading = false;
            }
        },
        async submitHand(front, mid, back) {
            if (!this.gameId || !this.myPlayerId) return;
            this.loading = true; this.error = null;
            try {
                const response = await apiService.submitHand(this.gameId, front, mid, back);
                if (response.data.success) {
                    await this.fetchGameState(true);
                } else {
                    this.error = response.data.error || '提交牌型失败';
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '提交牌型请求错误';
            } finally {
                this.loading = false;
            }
        },
        async resetForNewRound() {
            if (!this.gameId) return;
            this.loading = true; this.error = null;
            try {
                const response = await apiService.resetGameForNewRound(this.gameId);
                if (response.data.success) {
                    await this.fetchGameState(true); // 获取重置后的状态
                    if (this.gameState?.status === 'waiting') { // 如果重置到waiting状态
                        this.startPolling(); // 重新开始轮询等待玩家
                    }
                } else {
                    this.error = response.data.error || '重置游戏失败';
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '重置游戏请求错误';
            } finally {
                this.loading = false;
            }
        },
        startPolling() {
            this.stopPolling();
            if (this.gameId) {
                this.fetchGameState(false); // 第一次获取时不强制loading，除非之前没有数据
                this.pollingInterval = setInterval(() => {
                    if (this.gameId && this.gameState?.status !== 'finished' && !this.lastPollFailed) {
                        this.fetchGameState();
                    } else if (this.gameState?.status === 'finished' || this.lastPollFailed) {
                        this.stopPolling();
                    }
                }, 5000);
            }
        },
        stopPolling() {
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
            }
        },
        clearGameData() {
            this.stopPolling();
            this.gameId = null;
            this.gameCode = null;
            this.gameState = null;
            this.players = [];
            this.myCards = [];
            this.myPlayerId = null;
            this.error = null;
            this.loading = false;
            localStorage.removeItem('currentGameId');
            localStorage.removeItem('currentGameCode');
        },
        async tryRestoreSession() {
            if (this.playerSessionId && this.gameId) { // 确保 gameId 也存在
                await this.fetchGameState(true);
                if (this.isGameActive) { // isGameActive 会检查 gameState.status
                    this.startPolling();
                } else if (!this.gameState){ // 如果 fetchGameState 后 gameState 仍然是 null (例如房间不存在了)
                    this.clearGameData(); // 清理无效的 gameId 和 gameCode
                }
            } else { // 如果 localStorage 中没有 gameId，也清理一下
                this.clearGameData();
            }
        }
    }
});
