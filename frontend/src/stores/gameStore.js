import { defineStore } from 'pinia';
import apiService from '../services/apiService';

export const useGameStore = defineStore('game', {
    state: () => ({
        gameId: localStorage.getItem('currentGameId') || null, // 尝试从localStorage恢复
        gameCode: localStorage.getItem('currentGameCode') || null,
        gameState: null, // 后端返回的 games 表信息
        players: [],     // 后端返回的 players 表信息 (处理后)
        myCards: [],     // 当前玩家手牌
        myPlayerId: null, // 当前玩家在 players 表中的 ID
        playerSessionId: localStorage.getItem('playerSessionId') || null,
        error: null,
        loading: false,
        pollingInterval: null,
        lastPollFailed: false,
    }),
    getters: {
        isGameActive: (state) => !!state.gameId && state.gameState && state.gameState.status !== 'finished',
        isMyTurnToSubmit: (state) => {
            if (!state.isGameActive || state.gameState.status !== 'playing') return false;
            const me = state.players.find(p => p.is_me);
            return me && !me.is_ready;
        },
        canStartGame: (state) => {
            if (!state.gameState || state.gameState.status !== 'waiting' || !state.players.length) return false;
            const me = state.players.find(p => p.is_me);
            // 假设第一个加入的玩家（order 1）是房主，或者可以由后端指定房主
            // 并且玩家人数达到下限 (例如2人)
            return me && me.order === 1 && state.players.length >= 2 && state.players.length <= state.gameState.max_players;
        },
        allPlayersReady: (state) => {
            if (!state.players.length || state.gameState?.status !== 'playing') return false;
            return state.players.every(p => p.is_ready);
        },
        myPlayerDetails: (state) => state.players.find(p => p.is_me),
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
             if (data.player_session_id && !this.playerSessionId) { // 后端可能主动下发
                this.playerSessionId = data.player_session_id;
                localStorage.setItem('playerSessionId', this.playerSessionId);
            }
            if (data.game_state) this.gameState = data.game_state;
            if (data.players) {
                this.players = data.players;
                const me = data.players.find(p => p.is_me);
                if (me) {
                    this.myCards = me.my_cards || [];
                    this.myPlayerId = me.id;
                }
            }
        },
        async createGame(maxPlayers = 4) {
            this.loading = true; this.error = null;
            try {
                const response = await apiService.createGame(maxPlayers);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data);
                    // 创建成功后自动加入
                    await this.joinGame(this.gameCode, `房主_${this.playerSessionId?.substring(0,4) || '玩家'}`);
                } else {
                    this.error = response.data.error || '创建房间失败';
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '创建房间请求错误';
            } finally {
                this.loading = false;
            }
        },
        async joinGame(gameCode, playerName) {
            this.loading = true; this.error = null;
            try {
                const response = await apiService.joinGame(gameCode, playerName);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data); // game_id, player_session_id等
                    this.gameCode = gameCode; // 确保gameCode被设置
                    localStorage.setItem('currentGameCode', this.gameCode);
                    await this.fetchGameState(true); // 加入后立即获取一次状态
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
            if (!this.gameId) return;
            this.loading = true; this.error = null;
            try {
                const response = await apiService.startGame(this.gameId);
                if (response.data.success) {
                    await this.fetchGameState(true); // 开始后立即获取状态，此时应有牌
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
                 this.clearGameData(); // 如果没有gameId，清理状态
                 return;
            }
            if (forceUpdateLoading) this.loading = true;
            // this.error = null; // 轮询时不清除之前的错误，除非成功
            try {
                const response = await apiService.getGameState(this.gameId);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data);
                    this.error = null; // 成功获取状态后清除错误
                    this.lastPollFailed = false;

                    // 如果游戏结束，停止轮询
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
                 // 连续多次失败则停止轮询
                // if (consecutive_failures > 3) this.stopPolling();
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
                    await this.fetchGameState(true); // 提交后立即更新状态
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
                    await this.fetchGameState(true);
                    this.startPolling(); // 重置后可能需要重新开始轮询
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
                this.fetchGameState(true); // 立即获取一次
                this.pollingInterval = setInterval(() => {
                    if (this.gameId && this.gameState?.status !== 'finished' && !this.lastPollFailed) {
                        this.fetchGameState();
                    } else if (this.gameState?.status === 'finished' || this.lastPollFailed) {
                        this.stopPolling(); // 如果游戏结束或上次轮询失败，则停止
                    }
                }, 5000); // 每5秒轮询一次
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
            // this.playerSessionId = null; // Session ID 通常应该保留，除非用户明确登出或重置会话
            this.error = null;
            this.loading = false;
            localStorage.removeItem('currentGameId');
            localStorage.removeItem('currentGameCode');
            // localStorage.removeItem('playerSessionId'); // 考虑是否要清除
        },
        // 当组件挂载时，尝试恢复游戏状态
        async tryRestoreSession() {
            if (this.playerSessionId && this.gameId) {
                console.log("尝试恢复会话和游戏状态...");
                await this.fetchGameState(true);
                if (this.isGameActive) {
                    this.startPolling();
                } else if (this.gameState?.status === 'finished') {
                    // 如果恢复后发现游戏已结束，则不需要轮询
                } else {
                     // 如果恢复失败（例如gameId无效或已过期），清理状态
                     // this.clearGameData(); // fetchGameState内部会处理错误
                }
            }
        }
    }
});
