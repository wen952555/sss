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
        isGameActive: (state) => !!state.gameId && state.gameState && state.gameState.status !== 'finished',
        myPlayerDetails: (state) => state.players.find(p => p.is_me === true),
        canStartGame(state) {
            if (!this.myPlayerDetails) { /* console.warn("[gameStore] canStartGame: myPlayerDetails is falsy"); */ return false; }
            if (!state.gameState || state.gameState.status !== 'waiting') { /* console.warn("[gameStore] canStartGame: game not waiting or gameState missing"); */ return false; }
            if (state.players.length < 2) { /* console.warn("[gameStore] canStartGame: not enough players"); */ return false; }
            const isHost = this.myPlayerDetails.order === 1;
            const enoughPlayers = state.players.length >= 2 && state.players.length <= state.gameState.max_players;
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
            // console.log("[gameStore] _updateStateFromResponse called with data:", data);
            if (data.game_id !== undefined) {
                this.gameId = data.game_id;
                if (data.game_id) localStorage.setItem('currentGameId', this.gameId);
                else localStorage.removeItem('currentGameId');
            }
            // 确保 gameCode 被正确更新和存储
            if (data.game_code !== undefined) {
                this.gameCode = data.game_code;
                 if (data.game_code) localStorage.setItem('currentGameCode', this.gameCode);
                else localStorage.removeItem('currentGameCode');
                // console.log("[gameStore] Updated gameCode from response:", this.gameCode);
            }
            if (data.player_session_id && (!this.playerSessionId || this.playerSessionId !== data.player_session_id)) {
                this.playerSessionId = data.player_session_id;
                localStorage.setItem('playerSessionId', this.playerSessionId);
                // console.log("[gameStore] Updated playerSessionId:", this.playerSessionId);
            }
            if (data.game_state) this.gameState = data.game_state;
            if (data.players) {
                this.players = data.players.map(p => ({ ...p, is_me: p.session_id === this.playerSessionId }));
                const me = this.players.find(p => p.is_me);
                if (me) {
                    this.myCards = me.my_cards || [];
                    this.myPlayerId = me.id;
                } else {
                    this.myCards = [];
                    this.myPlayerId = null;
                }
            }
        },
        async createGame(maxPlayers = 4) {
            // console.log("[gameStore] createGame action started. Max players:", maxPlayers);
            this.loading = true; this.error = null;
            try {
                const response = await apiService.createGame(maxPlayers);
                // console.log("[gameStore] createGame API response:", response);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data);
                    const playerName = localStorage.getItem('playerName') || `房主_${this.playerSessionId?.substring(0,4) || '新玩家'}`;
                    // console.log("[gameStore] createGame success. Now attempting to join game as:", playerName, "with gameCode:", this.gameCode);
                    await this.joinGame(this.gameCode, playerName);
                } else {
                    this.error = response.data.error || '创建房间失败 (API no success)';
                    this.clearGameData();
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '创建房间请求发生错误';
                this.clearGameData();
            } finally {
                this.loading = false;
            }
        },
        async joinGame(gameCode, playerName) {
            // console.log(`[gameStore] joinGame action started. Code: ${gameCode}, Name: ${playerName}`);
            this.loading = true; this.error = null;
            try {
                const response = await apiService.joinGame(gameCode, playerName);
                // console.log("[gameStore] joinGame API response:", response);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data);
                    // 确保 gameCode 在这里也被正确设置，以防后端 join_game 响应中没有 game_code
                    if (gameCode && !this.gameCode) {
                        this.gameCode = gameCode;
                        localStorage.setItem('currentGameCode', this.gameCode);
                        // console.log("[gameStore] Set gameCode in joinGame (if missing from response):", this.gameCode);
                    }
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
            if (!this.gameId || !this.canStartGame) { this.error = "不满足开始游戏条件或权限不足。"; return; }
            this.loading = true; this.error = null;
            try {
                const response = await apiService.startGame(this.gameId);
                if (response.data.success) {
                    await this.fetchGameState(true);
                } else { this.error = response.data.error || '开始游戏失败'; }
            } catch (err) { this.error = err.response?.data?.error || err.message || '开始游戏请求错误'; } 
            finally { this.loading = false; }
        },
        async fetchGameState(forceUpdateLoading = false) {
            if (!this.gameId) { this.clearGameData(); return; }
            if (forceUpdateLoading) this.loading = true;
            try {
                const response = await apiService.getGameState(this.gameId);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data);
                    this.error = null; this.lastPollFailed = false;
                    if (this.gameState?.status === 'finished') this.stopPolling();
                } else { this.error = response.data.error || '获取游戏状态失败'; this.lastPollFailed = true; }
            } catch (err) { this.error = err.response?.data?.error || err.message || '获取游戏状态请求错误'; this.lastPollFailed = true; } 
            finally { if (forceUpdateLoading) this.loading = false; }
        },
        async submitHand(front, mid, back) { /* ... (与上一版相同) ... */ },
        async leaveGame() { /* ... (与上一版相同) ... */ },
        async resetForNewRound() { /* ... (与上一版相同) ... */ },
        startPolling() { /* ... (与上一版相同) ... */ },
        stopPolling() { /* ... (与上一版相同) ... */ },
        clearGameData() {
            this.stopPolling(); this.gameId = null; this.gameCode = null; this.gameState = null;
            this.players = []; this.myCards = []; this.myPlayerId = null; /* this.error = null; */
            this.loading = false; localStorage.removeItem('currentGameId'); localStorage.removeItem('currentGameCode');
        },
        async tryRestoreSession() {
             if (this.playerSessionId && this.gameId) {
                await this.fetchGameState(true);
                if (this.isGameActive) this.startPolling();
                else if (!this.gameState) this.clearGameData();
            } else { this.clearGameData(); }
        }
    }
});
