// frontend/src/stores/gameStore.js
import { defineStore } from 'pinia';
import apiService from '../services/apiService';

export const useGameStore = defineStore('game', {
    state: () => ({
        gameId: localStorage.getItem('currentGameId') || null,
        gameCode: localStorage.getItem('currentGameCode') || null,
        gameState: null, 
        players: [],     
        myCards: [],     
        myPlayerId: null, 
        playerSessionId: localStorage.getItem('playerSessionId') || null,
        error: null,
        loading: false,
        pollingInterval: null,
        lastPollFailed: false,
    }),
    getters: {
        isGameActive: (state) => !!state.gameId && !!state.gameState && state.gameState.status !== 'finished',
        myPlayerDetails: (state) => state.players.find(p => p.is_me === true),
        
        // 修改后的 canStartGame getter
        canStartGame(state) {
            if (!this.myPlayerDetails) { 
                // console.warn("[gameStore] canStartGame: myPlayerDetails is falsy");
                return false; 
            }
            // 确保 gameState 和 gameState.status 以及 gameState.max_players 都已定义
            if (!state.gameState || state.gameState.status !== 'waiting' || typeof state.gameState.max_players === 'undefined') { 
                // console.warn("[gameStore] canStartGame: game not in 'waiting' state or gameState/max_players missing. Status:", state.gameState?.status, "MaxPlayers:", state.gameState?.max_players);
                return false; 
            }

            const isHost = this.myPlayerDetails.order === 1; // 假设 order 1 是房主
            // 条件：房主，并且玩家人数达到游戏设定的最大人数，并且游戏状态是等待中
            const isFull = state.players.length === state.gameState.max_players;
            
            // console.log(`[gameStore] canStartGame check: isHost=${isHost}, isFull=${isFull}, myOrder=${this.myPlayerDetails.order}, players.length=${state.players.length}, max_players=${state.gameState.max_players}, status=${state.gameState.status}`);
            return isHost && isFull; // 只有房主并且满员时才能开始
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
        _updateStateFromResponse(data, source = "unknown") {
            // console.log(`[gameStore] _updateStateFromResponse (from ${source}) called with data:`, JSON.parse(JSON.stringify(data)));
            if (data.game_id !== undefined) {
                this.gameId = data.game_id;
                if (data.game_id) localStorage.setItem('currentGameId', this.gameId);
                else localStorage.removeItem('currentGameId');
            }
            if (data.game_code !== undefined) {
                this.gameCode = data.game_code;
                 if (data.game_code) localStorage.setItem('currentGameCode', this.gameCode);
                else localStorage.removeItem('currentGameCode');
            }
            if (data.player_session_id && (!this.playerSessionId || this.playerSessionId !== data.player_session_id)) {
                this.playerSessionId = data.player_session_id;
                localStorage.setItem('playerSessionId', this.playerSessionId);
            }
            if (data.game_state) {
                this.gameState = data.game_state;
            }
            if (Array.isArray(data.players)) {
                this.players = data.players.map(p => ({ ...p, is_me: p.session_id === this.playerSessionId }));
                const me = this.players.find(p => p.is_me);
                if (me) {
                    this.myCards = me.my_cards || [];
                    this.myPlayerId = me.id;
                } else {
                    this.myCards = [];
                    this.myPlayerId = null;
                }
            } else if (data.game_state && !data.players && source === "fetchGameState") { 
                this.players = []; 
            }
        },
        async createGame(maxPlayers = 4) {
            this.loading = true; this.error = null;
            try {
                const response = await apiService.createGame(maxPlayers);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data, "createGame_api_response");
                    const playerName = localStorage.getItem('playerName') || `房主_${this.playerSessionId?.substring(0,4) || '新'}`;
                    if (!this.gameCode) {
                        this.error = "创建房间后未能获取房间码。"; this.clearGameData(); return;
                    }
                    await this.joinGame(this.gameCode, playerName); 
                    if (this.error) { console.error("[gameStore] Auto-join after createGame failed:", this.error); }
                } else {
                    this.error = response.data.error || '创建房间失败'; this.clearGameData();
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '创建请求错误'; this.clearGameData();
            } finally { this.loading = false; }
        },
        async joinGame(gameCode, playerName) {
            this.loading = true; let joinError = null;
            try {
                if (!gameCode || !playerName) {
                    joinError = "缺少房间码或昵称"; throw new Error(joinError);
                }
                const response = await apiService.joinGame(gameCode, playerName);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data, "joinGame_api_response");
                    if (gameCode && (!this.gameCode || this.gameCode !== gameCode)) {
                        this.gameCode = gameCode; localStorage.setItem('currentGameCode', this.gameCode);
                    }
                    await this.fetchGameState(true); 
                    this.startPolling();
                    this.error = null; 
                } else {
                    joinError = response.data.error || '加入房间失败'; throw new Error(joinError);
                }
            } catch (err) {
                this.error = joinError || err.message || '加入请求错误';
            } finally { this.loading = false; }
        },
        async fetchGameState(forceUpdateLoading = false) {
            if (!this.gameId) { this.clearGameData(); return; }
            if (forceUpdateLoading && !this.loading) this.loading = true;
            try {
                const response = await apiService.getGameState(this.gameId);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data, "fetchGameState_api_response");
                    this.error = null; this.lastPollFailed = false;
                    if (this.gameState?.status === 'finished') {
                        this.stopPolling();
                    } else if ((this.gameState?.status === 'waiting' || this.gameState?.status === 'playing') && !this.pollingInterval) {
                         this.startPolling();
                    }
                } else { 
                    this.error = response.data.error || '获取状态失败'; this.lastPollFailed = true; 
                }
            } catch (err) { 
                this.error = err.response?.data?.error || err.message || '获取状态请求错误'; this.lastPollFailed = true; 
            } 
            finally { if (forceUpdateLoading) this.loading = false; }
        },
        async startGame() { 
            if (!this.gameId || !this.canStartGame) { this.error = "不满足开始游戏条件或您不是房主。"; return; } // 更明确的错误提示
            this.loading = true; this.error = null;
            try {
                const response = await apiService.startGame(this.gameId);
                if (response.data.success) { await this.fetchGameState(true); } 
                else { this.error = response.data.error || '开始游戏失败'; }
            } catch (err) { this.error = err.response?.data?.error || err.message || '开始游戏请求错误'; } 
            finally { this.loading = false; }
        },
        async submitHand(front, mid, back) {
            if (!this.gameId || !this.myPlayerId) return;
            this.loading = true; this.error = null;
            try {
                const response = await apiService.submitHand(this.gameId, front, mid, back);
                if (response.data.success) { await this.fetchGameState(true); }
                else { this.error = response.data.error || '提交牌型失败'; }
            } catch (err) { this.error = err.response?.data?.error || err.message || '提交牌型请求错误'; }
            finally { this.loading = false; }
        },
        async leaveGame() {
            if (!this.gameId) { this.clearGameData(); return; }
            this.loading = true; this.error = null;
            try {
                const response = await apiService.leaveGame(this.gameId);
                if (response.data.success) { this.clearGameData(); } 
                else { 
                    this.error = response.data.error || '离开房间失败';
                    if (response.data.error && response.data.error.includes("已不在该房间中")) {
                        this.clearGameData();
                    }
                }
            } catch (err) { this.error = err.response?.data?.error || err.message || '离开房间请求错误'; } 
            finally { this.loading = false; }
        },
        async resetForNewRound() {
            if (!this.gameId) return;
            this.loading = true; this.error = null;
            try {
                const response = await apiService.resetGameForNewRound(this.gameId);
                if (response.data.success) {
                    await this.fetchGameState(true); 
                    if (this.gameState?.status === 'waiting') { this.startPolling(); }
                } else { this.error = response.data.error || '重置游戏失败'; }
            } catch (err) { this.error = err.response?.data?.error || err.message || '重置游戏请求错误'; } 
            finally { this.loading = false; }
        },
        startPolling() {
            this.stopPolling();
            if (this.gameId) {
                this.pollingInterval = setInterval(() => {
                    if (this.gameId && this.gameState?.status !== 'finished' && !this.lastPollFailed) {
                        this.fetchGameState();
                    } else { this.stopPolling(); }
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
            this.stopPolling(); this.gameId = null; this.gameCode = null; this.gameState = null;
            this.players = []; this.myCards = []; this.myPlayerId = null;
            this.loading = false; localStorage.removeItem('currentGameId'); localStorage.removeItem('currentGameCode');
        },
        async tryRestoreSession() {
            if (this.playerSessionId && this.gameId) {
                await this.fetchGameState(true); 
                if (this.isGameActive) { 
                    if(!this.pollingInterval) this.startPolling(); 
                } else if (!this.gameState && this.error){ 
                    // 如果获取状态失败，保留错误信息
                } else if (!this.gameState && !this.error) { 
                    this.clearGameData(); // 如果房间不存在了
                }
            } else { 
                this.clearGameData();
            }
        }
    }
});
