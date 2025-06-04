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
        canStartGame(state) {
            if (!this.myPlayerDetails) return false;
            if (!state.gameState || state.gameState.status !== 'waiting' || typeof state.gameState.max_players === 'undefined') return false;
            const isHost = this.myPlayerDetails.order === 1;
            const isFull = state.players.length === state.gameState.max_players;
            return isHost && isFull;
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
        // Helper to ensure 'this' context is correct when calling other actions
        // No longer strictly necessary with Pinia's proxying, but good for clarity if needed
        // _callAction(actionName, ...args) {
        //   if (typeof this[actionName] === 'function') {
        //     return this[actionName](...args);
        //   }
        //   console.error(`[gameStore] Action ${actionName} not found`);
        // },

        _updateStateFromResponse(data, source = "unknown") {
            // console.log(`[gameStore] _updateStateFromResponse (from ${source}) data:`, JSON.parse(JSON.stringify(data)));
            if (data.game_id !== undefined) {
                this.gameId = data.game_id;
                if (data.game_id) localStorage.setItem('currentGameId', this.gameId); else localStorage.removeItem('currentGameId');
            }
            if (data.game_code !== undefined) {
                this.gameCode = data.game_code;
                 if (data.game_code) localStorage.setItem('currentGameCode', this.gameCode); else localStorage.removeItem('currentGameCode');
            }
            if (data.player_session_id && (!this.playerSessionId || this.playerSessionId !== data.player_session_id)) {
                this.playerSessionId = data.player_session_id;
                localStorage.setItem('playerSessionId', this.playerSessionId);
            }
            if (data.game_state) this.gameState = data.game_state;
            if (Array.isArray(data.players)) {
                this.players = data.players.map(p => ({ ...p, is_me: p.session_id === this.playerSessionId }));
                const me = this.players.find(p => p.is_me);
                if (me) {
                    this.myCards = me.my_cards || []; this.myPlayerId = me.id;
                } else { this.myCards = []; this.myPlayerId = null; }
            } else if (data.game_state && !data.players && source.includes("fetchGameState")) { 
                this.players = []; 
            }
            // console.log(`[gameStore] State after _update (from ${source}): gameId=${this.gameId}, gameCode=${this.gameCode}, playersCount=${this.players.length}`);
        },

        // --- Core Actions ---
        async createGame(maxPlayers = 4) {
            console.log("[gameStore] ACTION: createGame started. Max players:", maxPlayers, "Initial playerSessionId:", this.playerSessionId);
            this.loading = true; this.error = null;
            try {
                const response = await apiService.createGame(maxPlayers);
                console.log("[gameStore] createGame API response received:", JSON.parse(JSON.stringify(response.data)));
                if (response.data.success && response.data.game_code && response.data.game_id) {
                    this._updateStateFromResponse(response.data, "createGame_api_success");
                    const playerName = localStorage.getItem('playerName') || `房主_${this.playerSessionId?.substring(0,4) || '新'}`;
                    if (!this.gameCode) {
                        this.error = "创建房间后未能获取房间码。"; throw new Error(this.error);
                    }
                    await this.joinGame(this.gameCode, playerName); // Uses 'this' to call another action
                    if (this.error) { throw new Error(`自动加入房间失败: ${this.error}`); }
                } else {
                    this.error = response.data.error || '创建房间失败 (API response indicates failure or missing data)';
                    throw new Error(this.error);
                }
            } catch (err) {
                this.error = err.message || '创建房间请求发生未知错误'; // Use err.message
                console.error("[gameStore] createGame CATCH block error:", this.error, err);
                this.clearGameData(); // On any create game error, clear data
            } finally {
                this.loading = false;
                console.log("[gameStore] ACTION: createGame finished. Loading:", this.loading, "Error:", this.error, "GameID:", this.gameId);
            }
        },

        async joinGame(gameCode, playerName) {
            console.log(`[gameStore] ACTION: joinGame started. Code: '${gameCode}', Name: '${playerName}', SessionId: '${this.playerSessionId}'`);
            this.loading = true; 
            // Do not clear this.error here, let createGame's final error state persist if join fails during auto-join
            let joinAttemptError = null; 
            try {
                if (!gameCode || !playerName) {
                    joinAttemptError = "加入房间信息不完整 (缺少房间码或昵称)"; throw new Error(joinAttemptError);
                }
                const response = await apiService.joinGame(gameCode, playerName);
                console.log("[gameStore] joinGame API response received:", JSON.parse(JSON.stringify(response.data)));
                if (response.data.success && response.data.game_id) {
                    this._updateStateFromResponse(response.data, "joinGame_api_success");
                    if (gameCode && (!this.gameCode || this.gameCode !== gameCode)) {
                        this.gameCode = gameCode; localStorage.setItem('currentGameCode', this.gameCode);
                    }
                    await this.fetchGameState(true); 
                    this.startPolling(); // Uses 'this' to call another action
                    this.error = null; // Clear error only on successful join and fetch
                } else {
                    joinAttemptError = response.data.error || '加入房间失败 (API response indicates failure)'; 
                    throw new Error(joinAttemptError);
                }
            } catch (err) {
                this.error = joinAttemptError || err.message || '加入房间请求发生网络或未知错误';
                console.error("[gameStore] joinGame CATCH block error:", this.error, err);
            } finally {
                this.loading = false;
                console.log("[gameStore] ACTION: joinGame finished. Loading:", this.loading, "Error:", this.error, "GameID:", this.gameId);
            }
        },

        async fetchGameState(forceUpdateLoading = false) {
            if (!this.gameId) { if (typeof this.clearGameData === 'function') this.clearGameData(); return; } // Check if clearGameData is a function
            if (forceUpdateLoading && !this.loading) this.loading = true;
            try {
                const response = await apiService.getGameState(this.gameId);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data, "fetchGameState_api_response");
                    this.error = null; this.lastPollFailed = false;
                    if (this.gameState?.status === 'finished') {
                        if (typeof this.stopPolling === 'function') this.stopPolling();
                    } else if ((this.gameState?.status === 'waiting' || this.gameState?.status === 'playing') && !this.pollingInterval) {
                         if (typeof this.startPolling === 'function') this.startPolling();
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
            if (!this.gameId || !this.canStartGame) { this.error = "不满足开始游戏条件或您不是房主。"; return; }
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
            if (!this.gameId) { if (typeof this.clearGameData === 'function') this.clearGameData(); return; }
            this.loading = true; this.error = null;
            try {
                const response = await apiService.leaveGame(this.gameId);
                if (response.data.success) { if (typeof this.clearGameData === 'function') this.clearGameData(); } 
                else { 
                    this.error = response.data.error || '离开房间失败';
                    if (response.data.error && response.data.error.includes("已不在该房间中")) {
                        if (typeof this.clearGameData === 'function') this.clearGameData();
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
                    if (this.gameState?.status === 'waiting') { if (typeof this.startPolling === 'function') this.startPolling(); }
                } else { this.error = response.data.error || '重置游戏失败'; }
            } catch (err) { this.error = err.response?.data?.error || err.message || '重置游戏请求错误'; } 
            finally { this.loading = false; }
        },

        startPolling() { // Correctly defined as an action
            this.stopPolling(); // 'this' here refers to the store instance
            if (this.gameId) {
                this.pollingInterval = setInterval(() => {
                    if (this.gameId && this.gameState?.status !== 'finished' && !this.lastPollFailed) {
                        this.fetchGameState();
                    } else { this.stopPolling(); }
                }, 5000);
            }
        },

        stopPolling() { // Correctly defined as an action
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
            }
        },

        clearGameData() { // Correctly defined as an action
            console.log("[gameStore] ACTION: clearGameData called.");
            this.stopPolling(); 
            this.gameId = null; this.gameCode = null; this.gameState = null;
            this.players = []; this.myCards = []; this.myPlayerId = null;
            // this.error = null; // Optionally preserve last error
            this.loading = false; 
            localStorage.removeItem('currentGameId'); 
            localStorage.removeItem('currentGameCode');
        },

        async tryRestoreSession() { // Correctly defined as an action
            console.log("[gameStore] ACTION: tryRestoreSession called. gameId:", this.gameId, "playerSessionId:", this.playerSessionId);
            if (this.playerSessionId && this.gameId) {
                await this.fetchGameState(true); 
                if (this.isGameActive) { 
                    if(!this.pollingInterval) this.startPolling(); 
                } else if (!this.gameState && this.error){ 
                    // Error fetching, gameState is null
                } else if (!this.gameState && !this.error) { 
                    this.clearGameData(); // Room likely doesn't exist
                }
            } else { 
                this.clearGameData(); // No session to restore
            }
        }
    }
});
