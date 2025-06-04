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
        isGameLoading: (state) => state.loading, // 新增 getter 方便 UI 判断
        isGameActive: (state) => !!state.gameId && !!state.gameState && state.gameState.status !== 'waiting' && state.gameState.status !== 'finished',
        isGameWaiting: (state) => !!state.gameId && !!state.gameState && state.gameState.status === 'waiting',
        isGameFinished: (state) => !!state.gameState && state.gameState.status === 'finished',
        
        myPlayerDetails: (state) => {
            if (!state.playerSessionId || !Array.isArray(state.players) || state.players.length === 0) return null;
            return state.players.find(p => p.session_id === state.playerSessionId);
        },
        
        canStartGame(state) {
            const me = this.myPlayerDetails; // 使用 getter
            // console.log("[gameStore] Evaluating canStartGame...");
            // console.log("[gameStore] myPlayerDetails:", me ? JSON.parse(JSON.stringify(me)) : null);
            // console.log("[gameStore] gameState:", state.gameState ? JSON.parse(JSON.stringify(state.gameState)) : null);
            // console.log("[gameStore] players.length:", state.players.length);


            if (!me) { 
                // console.warn("[gameStore] canStartGame REJECT: myPlayerDetails is null/undefined.");
                return false; 
            }
            if (!state.gameState || state.gameState.status !== 'waiting' || typeof state.gameState.max_players === 'undefined') { 
                // console.warn("[gameStore] canStartGame REJECT: gameState issue. Status:", state.gameState?.status, "MaxPlayers:", state.gameState?.max_players);
                return false; 
            }
            
            const isHost = me.order === 1; 
            const isFull = state.players.length === state.gameState.max_players;
            
            // console.log(`[gameStore] canStartGame Check: isHost=${isHost} (myOrder=${me.order}), isFull=${isFull} (players.length=${state.players.length}, max_players=${state.gameState.max_players})`);
            
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
            if (data.game_state) {
                this.gameState = data.game_state;
            }
            if (Array.isArray(data.players)) {
                this.players = data.players.map(p => ({ ...p, is_me: p.session_id === this.playerSessionId }));
                const me = this.players.find(p => p.is_me); // Re-evaluate 'me' based on new players list
                if (me) {
                    this.myCards = me.my_cards || []; this.myPlayerId = me.id;
                } else { this.myCards = []; this.myPlayerId = null; }
            } else if (data.game_state && data.players === undefined && source.includes("fetchGameState")) { 
                this.players = []; 
            }
            // console.log(`[gameStore] State after _update (from ${source}): gameId=${this.gameId}, gameCode=${this.gameCode}, playersCount=${this.players.length}, gameStateStatus=${this.gameState?.status}, myPlayerOrder=${this.myPlayerDetails?.order}`);
        },
        async createGame(maxPlayers = 4) {
            this.loading = true; this.error = null;
            try {
                const response = await apiService.createGame(maxPlayers);
                if (response.data.success && response.data.game_code && response.data.game_id) {
                    this._updateStateFromResponse(response.data, "createGame_api_success");
                    const playerName = localStorage.getItem('playerName') || `房主_${this.playerSessionId?.substring(0,4) || '新'}`;
                    if (!this.gameCode) {
                        this.error = "创建房间后未能获取房间码。"; throw new Error(this.error);
                    }
                    await this.joinGame(this.gameCode, playerName); 
                    if (this.error) { throw new Error(`自动加入房间失败: ${this.error}`); }
                } else {
                    this.error = response.data.error || '创建房间失败 (API response indicates failure or missing data)';
                    throw new Error(this.error);
                }
            } catch (err) {
                this.error = err.message || '创建房间请求发生未知错误'; 
                this.clearGameData(); 
            } finally { this.loading = false; }
        },
        async joinGame(gameCode, playerName) {
            this.loading = true; let joinAttemptError = null; 
            try {
                if (!gameCode || !playerName) {
                    joinAttemptError = "加入房间信息不完整 (缺少房间码或昵称)"; throw new Error(joinAttemptError);
                }
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
                    joinAttemptError = response.data.error || '加入房间失败 (API response indicates failure)'; 
                    throw new Error(joinAttemptError);
                }
            } catch (err) {
                this.error = joinAttemptError || err.message || '加入房间请求发生网络或未知错误';
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
                    if (this.isGameFinished) { // Use getter
                        this.stopPolling();
                    } else if ((this.isGameWaiting || this.gameState?.status === 'playing') && !this.pollingInterval) {
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
            if (!this.gameId) { this.error = "没有有效的游戏ID。"; return; }
            if (!this.canStartGame) { // 使用 getter
                this.error = "不满足开始游戏条件 (您可能不是房主，或房间未满，或游戏状态不正确)。"; 
                // console.warn("[gameStore] startGame REJECTED by canStartGame getter. Value:", this.canStartGame, "Details - myPlayer:", this.myPlayerDetails, "gameState:", this.gameState, "players.length:", this.players.length);
                return; 
            }
            this.loading = true; this.error = null;
            try {
                const response = await apiService.startGame(this.gameId);
                if (response.data.success) { await this.fetchGameState(true); } 
                else { this.error = response.data.error || '开始游戏失败'; }
            } catch (err) { this.error = err.response?.data?.error || err.message || '开始游戏请求错误'; } 
            finally { this.loading = false; }
        },
        async submitHand(front, mid, back) {
            if (!this.gameId || !this.myPlayerId) {this.error = "无法提交牌型：游戏或玩家信息丢失。"; return;}
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
                this.clearGameData(); // 无论成功失败，前端都清理状态
                if (!response.data.success) { 
                    this.error = response.data.error || '离开房间时发生错误';
                }
            } catch (err) { 
                this.error = err.response?.data?.error || err.message || '离开房间请求错误';
                this.clearGameData(); // 网络错误等也清理
            } 
            finally { this.loading = false; }
        },
        async resetForNewRound() {
            if (!this.gameId) {this.error = "没有有效的游戏ID来重置。"; return;}
            // 权限检查应该在后端进行，例如只有房主可以重置
            this.loading = true; this.error = null;
            try {
                const response = await apiService.resetGameForNewRound(this.gameId);
                if (response.data.success) {
                    await this.fetchGameState(true); 
                    if (this.isGameWaiting) { this.startPolling(); } // 如果回到等待状态，开始轮询
                } else { this.error = response.data.error || '重置游戏失败'; }
            } catch (err) { this.error = err.response?.data?.error || err.message || '重置游戏请求错误'; } 
            finally { this.loading = false; }
        },
        startPolling() {
            this.stopPolling();
            if (this.gameId && !this.isGameFinished) { // 只在游戏未结束时轮询
                this.pollingInterval = setInterval(() => {
                    if (this.gameId && !this.isGameFinished && !this.lastPollFailed) {
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
            this.loading = false; 
            localStorage.removeItem('currentGameId'); localStorage.removeItem('currentGameCode');
            // error 通常不在这里清除，以便用户能看到之前的错误信息，除非是明确的新操作开始
        },
        async tryRestoreSession() {
            if (this.playerSessionId && this.gameId) {
                await this.fetchGameState(true); 
                if (this.isGameActive || this.isGameWaiting) { // 如果游戏在等待或进行中
                    if(!this.pollingInterval) this.startPolling(); 
                } else if (!this.gameState && this.error){ 
                    // 获取状态失败
                } else if (!this.gameState && !this.error) { 
                    this.clearGameData(); 
                }
            } else { 
                this.clearGameData();
            }
        }
    }
});
