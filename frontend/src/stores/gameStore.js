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
        isLoading: (state) => state.loading, // Renamed from isGameLoading for clarity
        // 游戏是否处于等待玩家加入的状态
        isGameWaiting: (state) => !!state.gameId && !!state.gameState && state.gameState.status === 'waiting',
        // 游戏是否已开始且正在进行中 (不是等待也不是结束)
        isGamePlaying: (state) => !!state.gameId && !!state.gameState && state.gameState.status === 'playing',
        // 游戏是否已结束
        isGameFinished: (state) => !!state.gameState && state.gameState.status === 'finished',
        // 任何形式的游戏激活状态（等待、游戏中）
        isGameSessionActive: (state) => !!state.gameId && !!state.gameState && (state.gameState.status === 'waiting' || state.gameState.status === 'playing'),

        myPlayerDetails: (state) => {
            if (!state.playerSessionId || !Array.isArray(state.players) || state.players.length === 0) return null;
            return state.players.find(p => p.session_id === state.playerSessionId);
        },
        
        canStartGame(state) {
            const me = this.myPlayerDetails;
            // console.log("[Store Getter] Evaluating canStartGame...");
            // console.log("  - me:", me ? JSON.parse(JSON.stringify(me)) : null);
            // console.log("  - gameState:", state.gameState ? JSON.parse(JSON.stringify(state.gameState)) : null);
            // console.log("  - players.length:", state.players.length);

            if (!me || !state.gameState || state.gameState.status !== 'waiting' || typeof state.gameState.max_players === 'undefined') {
                return false; 
            }
            const isHost = me.order === 1; 
            const isFull = state.players.length === state.gameState.max_players;
            // console.log(`  - isHost: ${isHost}, isFull: ${isFull}`);
            return isHost && isFull;
        },
        // ... (isMyTurnToSubmit, allPlayersReady 与上一版相同)
    },
    actions: {
        _updateStateFromResponse(data, source = "unknown") {
            // console.log(`[STORE ACTION] _updateStateFromResponse (from ${source}) data:`, JSON.parse(JSON.stringify(data)));
            if (data.player_session_id && (!this.playerSessionId || this.playerSessionId !== data.player_session_id)) {
                this.playerSessionId = data.player_session_id; // 更新或设置 playerSessionId
                localStorage.setItem('playerSessionId', this.playerSessionId);
            }
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
            if (data.game_state) {
                this.gameState = data.game_state;
            }
            if (Array.isArray(data.players)) {
                // 关键：在更新 players 之前，确保 playerSessionId 是最新的
                this.players = data.players.map(p => ({ ...p, is_me: p.session_id === this.playerSessionId }));
                const me = this.players.find(p => p.is_me);
                if (me) {
                    this.myCards = Array.isArray(me.my_cards) ? me.my_cards : []; 
                    this.myPlayerId = me.id;
                } else { 
                    this.myCards = []; this.myPlayerId = null; 
                }
            } else if (data.game_state && data.players === undefined && source.includes("fetchGameState")) { 
                this.players = []; this.myCards = [];
            }
            // console.log(`[STORE ACTION] State after _update (from ${source}): gameId=${this.gameId}, gameCode=${this.gameCode}, playersCount=${this.players.length}, gameStateStatus=${this.gameState?.status}, myPlayerOrder=${this.myPlayerDetails?.order}`);
        },

        // --- Core Actions ---
        // (createGame, joinGame, fetchGameState, startGame, submitHand, leaveGame, resetForNewRound, 
        //  startPolling, stopPolling, clearGameData, tryRestoreSession 的逻辑与上一版基本相同，
        //  关键是确保它们在成功或失败时正确更新 error 和 loading 状态，
        //  并且在需要时调用 _updateStateFromResponse 和其他action，如 fetchGameState, startPolling)
        //  为确保完整性，我会粘贴它们，并确保 this 的调用是正确的。

        async createGame(maxPlayers = 4) {
            this.loading = true; this.error = null;
            try {
                const response = await apiService.createGame(maxPlayers);
                if (response.data && response.data.success && response.data.game_code && response.data.game_id) {
                    this._updateStateFromResponse(response.data, "createGame_api_success");
                    const playerName = localStorage.getItem('playerName') || `房主_${this.playerSessionId?.substring(0,4) || '新'}`;
                    if (!this.gameCode) { throw new Error("创建房间后未能获取房间码。"); }
                    await this.joinGame(this.gameCode, playerName); 
                    if (this.error) { throw new Error(`自动加入房间失败: ${this.error}`); }
                } else {
                    throw new Error(response.data?.error || '创建房间API失败或数据缺失');
                }
            } catch (err) {
                this.error = err.message; 
                this.clearGameData(); 
            } finally { this.loading = false; }
        },

        async joinGame(gameCode, playerName) {
            this.loading = true; 
            // this.error = null; // 不要清除，如果createGame中join失败，createGame的error应该保留
            try {
                if (!gameCode || !playerName) { throw new Error("加入房间信息不完整"); }
                const response = await apiService.joinGame(gameCode, playerName);
                if (response.data && response.data.success && response.data.game_id) {
                    this._updateStateFromResponse(response.data, "joinGame_api_success");
                    if (gameCode && (!this.gameCode || this.gameCode !== gameCode)) {
                        this.gameCode = gameCode; localStorage.setItem('currentGameCode', this.gameCode);
                    }
                    await this.fetchGameState(true); 
                    this.startPolling();
                    this.error = null; // 只有当joinGame本身成功时才清除error
                } else {
                    throw new Error(response.data?.error || '加入房间API失败');
                }
            } catch (err) {
                this.error = err.message;
            } finally { this.loading = false; }
        },

        async fetchGameState(forceUpdateLoading = false) {
            if (!this.gameId) { this.clearGameData(); return; }
            if (forceUpdateLoading && !this.loading) this.loading = true;
            try {
                const response = await apiService.getGameState(this.gameId);
                if (response.data && response.data.success) {
                    this._updateStateFromResponse(response.data, "fetchGameState_api_success");
                    this.error = null; this.lastPollFailed = false;
                    if (this.isGameFinished) { this.stopPolling(); }
                    else if ((this.isGameWaiting || this.gameState?.status === 'playing') && !this.pollingInterval) {
                         this.startPolling();
                    }
                } else { 
                    this.error = response.data?.error || '获取状态失败'; this.lastPollFailed = true; 
                }
            } catch (err) { 
                this.error = err.response?.data?.error || err.message || '获取状态请求错误'; this.lastPollFailed = true; 
            } 
            finally { if (forceUpdateLoading) this.loading = false; }
        },

        async startGame() { 
            if (!this.gameId) { this.error = "没有游戏ID。"; return; }
            if (!this.canStartGame) { this.error = "不满足开始条件。"; return; }
            this.loading = true; this.error = null;
            try {
                const response = await apiService.startGame(this.gameId);
                if (response.data && response.data.success) { await this.fetchGameState(true); } 
                else { this.error = response.data?.error || '开始游戏失败'; }
            } catch (err) { this.error = err.response?.data?.error || err.message || '开始游戏请求错误'; } 
            finally { this.loading = false; }
        },

        async submitHand(front, mid, back) {
            if (!this.gameId || !this.myPlayerId) {this.error = "无法提交：缺少游戏或玩家信息。"; return;}
            this.loading = true; this.error = null;
            try {
                const response = await apiService.submitHand(this.gameId, front, mid, back);
                if (response.data && response.data.success) { await this.fetchGameState(true); }
                else { this.error = response.data?.error || '提交牌型失败'; }
            } catch (err) { this.error = err.response?.data?.error || err.message || '提交牌型请求错误'; }
            finally { this.loading = false; }
        },

        async leaveGame() {
            if (!this.gameId) { this.clearGameData(); return; } // 如果本就没在游戏里，直接清理
            this.loading = true; 
            const gameIdToLeave = this.gameId; // 保存当前gameId，因为clearGameData会清除它
            this.error = null;
            try {
                const response = await apiService.leaveGame(gameIdToLeave); // 使用保存的gameId
                // 无论API调用是否成功，前端都应该清理状态并返回初始界面
                if (!response.data?.success) { 
                    // 可以选择性地保留或设置一个温和的错误提示，但不阻止清理
                    console.warn("离开房间API未返回成功:", response.data?.error);
                }
            } catch (err) { 
                console.error("离开房间请求错误:", err);
                // 网络错误等也应该清理前端状态
            } 
            finally { 
                this.clearGameData(); // 最终总是清理前端状态
                this.loading = false; 
            }
        },

        async resetForNewRound() {
            if (!this.gameId) {this.error = "无有效游戏ID重置。"; return;}
            this.loading = true; this.error = null;
            try {
                const response = await apiService.resetGameForNewRound(this.gameId);
                if (response.data && response.data.success) {
                    await this.fetchGameState(true); 
                    if (this.isGameWaiting) { this.startPolling(); }
                } else { this.error = response.data?.error || '重置游戏失败'; }
            } catch (err) { this.error = err.response?.data?.error || err.message || '重置请求错误'; } 
            finally { this.loading = false; }
        },
        
        startPolling() {
            this.stopPolling();
            if (this.gameId && !this.isGameFinished) {
                this.pollingInterval = setInterval(() => {
                    if (this.gameId && !this.isGameFinished && !this.lastPollFailed) {
                        this.fetchGameState(false); // polling时不强制loading
                    } else { this.stopPolling(); }
                }, 5000);
            }
        },
        stopPolling() {
            if (this.pollingInterval) { clearInterval(this.pollingInterval); this.pollingInterval = null; }
        },
        clearGameData() {
            this.stopPolling(); 
            this.gameId = null; this.gameCode = null; this.gameState = null;
            this.players = []; this.myCards = []; this.myPlayerId = null;
            this.loading = false; 
            // this.error = null; // 考虑是否清除错误，通常操作后若有新错误会覆盖
            localStorage.removeItem('currentGameId'); localStorage.removeItem('currentGameCode');
            // playerSessionId 通常不在此处清除，它代表用户会话
        },
        async tryRestoreSession() {
            // console.log("[STORE ACTION] tryRestoreSession. gameId:", this.gameId, "session:", this.playerSessionId);
            if (this.playerSessionId && this.gameId) { // 必须两者都有才尝试恢复
                await this.fetchGameState(true); 
                if (this.isGameWaiting || this.isGamePlaying) { // 如果游戏在等待或进行中
                    if(!this.pollingInterval) this.startPolling(); 
                } else if (!this.gameState && !this.error) { // fetchGameState 成功但 gameState 为空 (例如房间被删除)
                    this.clearGameData(); 
                }
                // 如果 fetchGameState 失败 (this.error 会被设置)，则不自动清理，让用户看到错误
            } else { 
                this.clearGameData(); // 如果本地没有会话信息，则清理
            }
        }
    }
});
