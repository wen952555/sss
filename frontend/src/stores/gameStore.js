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
    getters: { /* ... (与上一版相同，确保它们依赖的状态正确) ... */ },
    actions: {
        // Helper to ensure 'this' context is correct when calling other actions from deeply nested promises or callbacks
        // Pinia usually handles 'this' correctly in actions, but this can be a safeguard
        // For direct calls like this.clearGameData() within an action, it should be fine.
        // The issue was likely that some actions were not defined in the actions object.

        _updateStateFromResponse(data, source = "unknown") {
            // console.log(`[STORE] _updateState (from ${source}) data:`, JSON.parse(JSON.stringify(data)));
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
                    this.myCards = Array.isArray(me.my_cards) ? me.my_cards : []; this.myPlayerId = me.id;
                } else { this.myCards = []; this.myPlayerId = null; }
            } else if (data.game_state && data.players === undefined && source.includes("fetchGameState")) { 
                this.players = []; this.myCards = [];
            }
        },

        // All actions must be defined here to be callable with 'this'
        startPolling() {
            this.stopPolling();
            if (this.gameId && !this.isGameFinished) {
                this.pollingInterval = setInterval(() => {
                    if (this.gameId && !this.isGameFinished && !this.lastPollFailed) {
                        this.fetchGameState(false); // Pass false to not show loading for polling
                    } else { this.stopPolling(); }
                }, 5000);
            }
        },
        stopPolling() {
            if (this.pollingInterval) { clearInterval(this.pollingInterval); this.pollingInterval = null; }
        },
        clearGameData() {
            console.log("[STORE ACTION] clearGameData called");
            this.stopPolling(); this.gameId = null; this.gameCode = null; this.gameState = null;
            this.players = []; this.myCards = []; this.myPlayerId = null;
            this.loading = false; // Ensure loading is reset
            // this.error = null; // Optionally clear error, or let it persist
            localStorage.removeItem('currentGameId'); localStorage.removeItem('currentGameCode');
        },
        async fetchGameState(forceUpdateLoading = false) {
            // console.log(`[STORE ACTION] fetchGameState called. Game ID: ${this.gameId}`);
            if (!this.gameId) { this.clearGameData(); return; }
            if (forceUpdateLoading && !this.loading) this.loading = true;
            try {
                const response = await apiService.getGameState(this.gameId);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data, "fetchGameState_api_success");
                    this.error = null; this.lastPollFailed = false;
                    if (this.isGameFinished) this.stopPolling();
                    else if ((this.isGameWaiting || this.gameState?.status === 'playing') && !this.pollingInterval) this.startPolling();
                } else { this.error = response.data.error || '获取状态失败'; this.lastPollFailed = true; }
            } catch (err) { this.error = err.response?.data?.error || err.message || '获取状态请求错误'; this.lastPollFailed = true; } 
            finally { if (forceUpdateLoading) this.loading = false; }
        },
        async tryRestoreSession() {
            console.log("[STORE ACTION] tryRestoreSession called. gameId:", this.gameId, "playerSessionId:", this.playerSessionId);
            if (this.playerSessionId && this.gameId) {
                await this.fetchGameState(true); 
                if (this.isGameActive || this.isGameWaiting) { 
                    if(!this.pollingInterval) this.startPolling(); 
                } else if (!this.gameState && !this.error) { this.clearGameData(); }
            } else { this.clearGameData(); }
        },

        async createGame(maxPlayers = 4) {
            console.log("[STORE ACTION] createGame started. Max players:", maxPlayers);
            this.loading = true; this.error = null;
            try {
                const response = await apiService.createGame(maxPlayers);
                if (response.data && response.data.success && response.data.game_code && response.data.game_id) {
                    this._updateStateFromResponse(response.data, "createGame_api_success");
                    const playerName = localStorage.getItem('playerName') || `房主_${this.playerSessionId?.substring(0,4) || '新'}`;
                    if (!this.gameCode) { throw new Error("创建房间后未能获取房间码。"); }
                    await this.joinGame(this.gameCode, playerName); 
                    if (this.error) { throw new Error(`自动加入房间失败: ${this.error}`); } // Propagate joinGame error
                } else {
                    throw new Error(response.data?.error || '创建房间失败 (API response error or missing data)');
                }
            } catch (err) {
                this.error = err.message; // Capture the most recent error
                console.error("[STORE CATCH] createGame error:", this.error, err);
                this.clearGameData(); // Clear state on any failure in createGame flow
            } finally {
                this.loading = false;
                console.log(`[STORE ACTION] createGame finished. Error: ${this.error}, GameID: ${this.gameId}`);
            }
        },
        async joinGame(gameCode, playerName) {
            console.log(`[STORE ACTION] joinGame started. Code: '${gameCode}', Name: '${playerName}'`);
            this.loading = true; 
            // this.error = null; // Don't clear error here if called from createGame
            try {
                if (!gameCode || !playerName) { throw new Error("加入房间信息不完整"); }
                const response = await apiService.joinGame(gameCode, playerName);
                if (response.data && response.data.success && response.data.game_id) {
                    this._updateStateFromResponse(response.data, "joinGame_api_success");
                    if (gameCode && (!this.gameCode || this.gameCode !== gameCode)) {
                        this.gameCode = gameCode; localStorage.setItem('currentGameCode', this.gameCode);
                    }
                    await this.fetchGameState(true); 
                    this.startPolling(); // 'this' should be correct here
                    // this.error = null; // Clear error only if joinGame itself is the top-level action and succeeds
                } else {
                    throw new Error(response.data?.error || '加入房间失败 (API response error)');
                }
            } catch (err) {
                this.error = err.message; // Capture error
                console.error("[STORE CATCH] joinGame error:", this.error, err);
                // If joinGame is calledstandalone and fails, maybe clear data or parts of it
                // if (!this.gameId) { this.clearGameData(); } // Example: if no gameId was established
            } finally {
                this.loading = false;
                console.log(`[STORE ACTION] joinGame finished. Error: ${this.error}, GameID: ${this.gameId}`);
            }
        },
        async startGame() { /* ... (ensure all 'this.action()' calls are valid) ... */ },
        async submitHand(front, mid, back) { /* ... (ensure all 'this.action()' calls are valid) ... */ },
        async leaveGame() { /* ... (ensure all 'this.action()' calls are valid and it calls this.clearGameData()) ... */ },
        async resetForNewRound() { /* ... (ensure all 'this.action()' calls are valid) ... */ },
    }
});
