// frontend/src/stores/gameStore.js
import { defineStore } from 'pinia';
import apiService from '../services/apiService';

export const useGameStore = defineStore('game', {
    state: () => ({
        gameId: localStorage.getItem('currentGameId') || null,
        gameCode: localStorage.getItem('currentGameCode') || null,
        gameState: null, 
        players: [],     
        myCards: [],     // 存储当前玩家的手牌
        myPlayerId: null, 
        playerSessionId: localStorage.getItem('playerSessionId') || null,
        error: null,
        loading: false,
        pollingInterval: null,
        lastPollFailed: false,
    }),
    getters: {
        isGameLoading: (state) => state.loading,
        isGameActive: (state) => !!state.gameId && !!state.gameState && state.gameState.status !== 'waiting' && state.gameState.status !== 'finished',
        isGameWaiting: (state) => !!state.gameId && !!state.gameState && state.gameState.status === 'waiting',
        isGameFinished: (state) => !!state.gameState && state.gameState.status === 'finished',
        myPlayerDetails: (state) => {
            if (!state.playerSessionId || !Array.isArray(state.players) || state.players.length === 0) return null;
            return state.players.find(p => p.session_id === state.playerSessionId);
        },
        canStartGame(state) {
            const me = this.myPlayerDetails;
            if (!me) return false; 
            if (!state.gameState || state.gameState.status !== 'waiting' || typeof state.gameState.max_players === 'undefined') return false; 
            const isHost = me.order === 1; 
            const isFull = state.players.length === state.gameState.max_players;
            return isHost && isFull;
        },
        isMyTurnToSubmit: (state) => {
            if (!this.isGameActive || state.gameState?.status !== 'playing' || !this.myPlayerDetails) return false;
            return !this.myPlayerDetails.is_ready;
        },
        allPlayersReady: (state) => {
            if (!Array.isArray(state.players) || state.players.length === 0 || state.gameState?.status !== 'playing') return false;
            return state.players.every(p => p.is_ready);
        },
    },
    actions: {
        _updateStateFromResponse(data, source = "unknown") {
            // console.log(`[gameStore] _updateState (from ${source}) data:`, JSON.parse(JSON.stringify(data)));
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
                    // 关键：确保从 'me' 对象中正确获取 my_cards
                    if (Array.isArray(me.my_cards)) {
                        this.myCards = me.my_cards;
                    } else if (source.includes("fetchGameState")) { 
                        // 如果是 fetchGameState 且 my_cards 不是数组 (或undefined), 可能是数据问题或未发牌
                        // 如果游戏已开始 (playing), 但没有牌，则清空，否则可能保留旧牌（虽然不应该）
                        if (this.gameState?.status === 'playing' || this.gameState?.status === 'finished') {
                            this.myCards = [];
                        }
                    }
                    this.myPlayerId = me.id;
                } else { 
                    this.myCards = []; this.myPlayerId = null; 
                }
            } else if (data.game_state && data.players === undefined && source.includes("fetchGameState")) { 
                this.players = []; this.myCards = [];
            }
        },
        async createGame(maxPlayers = 4) {
            this.loading = true; this.error = null;
            try {
                const response = await apiService.createGame(maxPlayers);
                if (response.data.success && response.data.game_code && response.data.game_id) {
                    this._updateStateFromResponse(response.data, "createGame_api_success");
                    const playerName = localStorage.getItem('playerName') || `房主_${this.playerSessionId?.substring(0,4) || '新'}`;
                    if (!this.gameCode) { this.error = "创建房间后未能获取房间码。"; throw new Error(this.error); }
                    await this.joinGame(this.gameCode, playerName); 
                    if (this.error) { throw new Error(`自动加入房间失败: ${this.error}`); }
                } else {
                    this.error = response.data.error || '创建房间失败'; throw new Error(this.error);
                }
            } catch (err) {
                this.error = err.message || '创建请求错误'; this.clearGameData(); 
            } finally { this.loading = false; }
        },
        async joinGame(gameCode, playerName) {
            this.loading = true; let joinAttemptError = null; 
            try {
                if (!gameCode || !playerName) { joinAttemptError = "信息不完整"; throw new Error(joinAttemptError); }
                const response = await apiService.joinGame(gameCode, playerName);
                if (response.data.success && response.data.game_id) {
                    this._updateStateFromResponse(response.data, "joinGame_api_success");
                    if (gameCode && (!this.gameCode || this.gameCode !== gameCode)) {
                        this.gameCode = gameCode; localStorage.setItem('currentGameCode', this.gameCode);
                    }
                    await this.fetchGameState(true); 
                    this.startPolling();
                    this.error = null; 
                } else {
                    joinAttemptError = response.data.error || '加入房间失败'; throw new Error(joinAttemptError);
                }
            } catch (err) { this.error = joinAttemptError || err.message || '加入请求错误';
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
                    if (this.isGameFinished) this.stopPolling();
                    else if ((this.isGameWaiting || this.gameState?.status === 'playing') && !this.pollingInterval) this.startPolling();
                } else { this.error = response.data.error || '获取状态失败'; this.lastPollFailed = true; }
            } catch (err) { this.error = err.response?.data?.error || err.message || '获取状态请求错误'; this.lastPollFailed = true; } 
            finally { if (forceUpdateLoading) this.loading = false; }
        },
        async startGame() { 
            if (!this.gameId || !this.canStartGame) { this.error = "不满足开始条件"; return; }
            this.loading = true; this.error = null;
            try {
                const response = await apiService.startGame(this.gameId);
                if (response.data.success) { await this.fetchGameState(true); } 
                else { this.error = response.data.error || '开始游戏失败'; }
            } catch (err) { this.error = err.response?.data?.error || err.message || '开始游戏请求错误'; } 
            finally { this.loading = false; }
        },
        async submitHand(front, mid, back) { /* ... (与上一版相同) ... */ },
        async leaveGame() { /* ... (与上一版相同) ... */ },
        async resetForNewRound() { /* ... (与上一版相同) ... */ },
        startPolling() {
            this.stopPolling();
            if (this.gameId && !this.isGameFinished) {
                this.pollingInterval = setInterval(() => {
                    if (this.gameId && !this.isGameFinished && !this.lastPollFailed) this.fetchGameState();
                    else this.stopPolling();
                }, 5000);
            }
        },
        stopPolling() {
            if (this.pollingInterval) { clearInterval(this.pollingInterval); this.pollingInterval = null; }
        },
        clearGameData() {
            this.stopPolling(); this.gameId = null; this.gameCode = null; this.gameState = null;
            this.players = []; this.myCards = []; this.myPlayerId = null;
            this.loading = false; 
            localStorage.removeItem('currentGameId'); localStorage.removeItem('currentGameCode');
        },
        async tryRestoreSession() {
            if (this.playerSessionId && this.gameId) {
                await this.fetchGameState(true); 
                if (this.isGameActive || this.isGameWaiting) { 
                    if(!this.pollingInterval) this.startPolling(); 
                } else if (!this.gameState && !this.error) { this.clearGameData(); }
            } else { this.clearGameData(); }
        }
    }
});
