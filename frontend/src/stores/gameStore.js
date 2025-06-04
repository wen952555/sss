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
            if (!state.gameState || state.gameState.status !== 'waiting') return false;
            if (state.players.length < 2) return false; // 至少需要2名玩家才能开始
            const isHost = this.myPlayerDetails.order === 1; // 假设order 1是房主
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
        _updateStateFromResponse(data, source = "unknown") {
            console.log(`[gameStore] _updateStateFromResponse (from ${source}) called with data:`, JSON.parse(JSON.stringify(data)));
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
            if (Array.isArray(data.players)) { // 确保 players 是数组
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
                // 如果 fetchGameState 返回了 game_state 但没有 players，说明房间里可能真的没人（除了刚创建的情况）
                this.players = []; 
            }
            // console.log("[gameStore] State after _updateStateFromResponse:", JSON.parse(JSON.stringify(this.$state)));
        },
        async createGame(maxPlayers = 4) {
            this.loading = true; this.error = null;
            try {
                const response = await apiService.createGame(maxPlayers);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data, "createGame_api_response");
                    const playerName = localStorage.getItem('playerName') || `房主_${this.playerSessionId?.substring(0,4) || '新'}`;
                    if (!this.gameCode) {
                        this.error = "创建房间后未能获取房间码。"; console.error(this.error); this.clearGameData(); return;
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
                    await this.fetchGameState(true); // <--- 关键：加入后立即获取状态
                    this.startPolling();
                    this.error = null; // 清除旧错误
                } else {
                    joinError = response.data.error || '加入房间失败'; throw new Error(joinError);
                }
            } catch (err) {
                this.error = joinError || err.message || '加入请求错误';
                console.error("[gameStore] joinGame catch error:", this.error, err);
            } finally { this.loading = false; }
        },
        async fetchGameState(forceUpdateLoading = false) {
            if (!this.gameId) { this.clearGameData(); return; }
            if (forceUpdateLoading && !this.loading) this.loading = true; // 避免重复设置loading
            try {
                const response = await apiService.getGameState(this.gameId);
                if (response.data.success) {
                    this._updateStateFromResponse(response.data, "fetchGameState_api_response");
                    this.error = null; this.lastPollFailed = false;
                    if (this.gameState?.status === 'finished') {
                        this.stopPolling();
                    } else if ((this.gameState?.status === 'waiting' || this.gameState?.status === 'playing') && !this.pollingInterval) {
                         this.startPolling(); // 如果游戏进行中但轮询未启动，则启动
                    }
                } else { 
                    this.error = response.data.error || '获取状态失败'; this.lastPollFailed = true; 
                }
            } catch (err) { 
                this.error = err.response?.data?.error || err.message || '获取状态请求错误'; this.lastPollFailed = true; 
            } 
            finally { if (forceUpdateLoading) this.loading = false; }
        },
        async startGame() { /* ... (与上一版基本相同，确保调用 fetchGameState) ... */ 
            if (!this.gameId || !this.canStartGame) { this.error = "不满足开始游戏条件。"; return; }
            this.loading = true; this.error = null;
            try {
                const response = await apiService.startGame(this.gameId);
                if (response.data.success) { await this.fetchGameState(true); } 
                else { this.error = response.data.error || '开始游戏失败'; }
            } catch (err) { this.error = err.response?.data?.error || err.message || '开始游戏请求错误'; } 
            finally { this.loading = false; }
        },
        async submitHand(front, mid, back) { /* ... (与上一版基本相同，确保调用 fetchGameState) ... */ },
        async leaveGame() { /* ... (与上一版基本相同，调用 clearGameData) ... */ },
        async resetForNewRound() { /* ... (与上一版基本相同，确保调用 fetchGameState 和 startPolling) ... */ },
        startPolling() {
            this.stopPolling();
            if (this.gameId) {
                // console.log("[gameStore] Starting polling for gameId:", this.gameId);
                this.pollingInterval = setInterval(() => {
                    if (this.gameId && this.gameState?.status !== 'finished' && !this.lastPollFailed) {
                        this.fetchGameState();
                    } else { this.stopPolling(); }
                }, 5000);
            }
        },
        stopPolling() {
            if (this.pollingInterval) {
                // console.log("[gameStore] Stopping polling for gameId:", this.gameId);
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
            }
        },
        clearGameData() {
            // console.log("[gameStore] clearGameData called.");
            this.stopPolling(); this.gameId = null; this.gameCode = null; this.gameState = null;
            this.players = []; this.myCards = []; this.myPlayerId = null; /* this.error = null; */
            this.loading = false; localStorage.removeItem('currentGameId'); localStorage.removeItem('currentGameCode');
        },
        async tryRestoreSession() {
            // console.log("[gameStore] tryRestoreSession called. gameId:", this.gameId, "playerSessionId:", this.playerSessionId);
            if (this.playerSessionId && this.gameId) {
                await this.fetchGameState(true); // 立即获取一次状态
                if (this.isGameActive) { // isGameActive 会检查 gameState.status
                    if(!this.pollingInterval) this.startPolling(); // 如果轮询未启动则启动
                } else if (!this.gameState && this.error){ 
                    // fetchGameState 失败且 gameState 还是 null
                    // this.clearGameData(); // 暂时不清除，让错误显示
                } else if (!this.gameState && !this.error) {
                    // fetchGameState 成功但 gameState 是 null (例如房间不存在了)
                    this.clearGameData();
                }
            } else { 
                this.clearGameData(); // 如果没有 session id 或 game id，则清理
            }
        }
    }
});
