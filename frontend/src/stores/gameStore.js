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
            // 暂时恢复到之前较简单的版本，减少变量，避免日志过多干扰创建流程
            if (!this.myPlayerDetails) return false;
            if (!state.gameState || state.gameState.status !== 'waiting' || typeof state.gameState.max_players === 'undefined') return false;
            
            const isHost = this.myPlayerDetails.order === 1;
            const isFull = state.players.length === state.gameState.max_players;
            // console.log(`[gameStore] CAN_START_GAME_CHECK: Host=${isHost}, Full=${isFull}, Order=${this.myPlayerDetails.order}, Len=${state.players.length}, Max=${state.gameState.max_players}, Status=${state.gameState.status}`);
            return isHost && isFull;
        },
        isMyTurnToSubmit: (state) => { /* ... */ },
        allPlayersReady: (state) => { /* ... */ },
    },
    actions: {
        _updateStateFromResponse(data, source = "unknown") {
            console.log(`[gameStore] _updateStateFromResponse (from ${source}) data:`, JSON.parse(JSON.stringify(data)));
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
                console.log(`[gameStore] playerSessionId updated by ${source} to:`, this.playerSessionId);
            }
            if (data.game_state) this.gameState = data.game_state;
            if (Array.isArray(data.players)) {
                this.players = data.players.map(p => ({ ...p, is_me: p.session_id === this.playerSessionId }));
                const me = this.players.find(p => p.is_me);
                if (me) {
                    this.myCards = me.my_cards || []; this.myPlayerId = me.id;
                } else {
                    this.myCards = []; this.myPlayerId = null;
                    // console.warn(`[gameStore] _updateState: 'me' not found. SessionID: ${this.playerSessionId}. Players:`, JSON.parse(JSON.stringify(data.players)));
                }
            } else if (data.game_state && !data.players && source.includes("fetchGameState")) { 
                this.players = []; 
            }
             console.log(`[gameStore] State after _update (from ${source}): gameId=${this.gameId}, gameCode=${this.gameCode}, playersCount=${this.players.length}`);
        },
        async createGame(maxPlayers = 4) {
            console.log("[gameStore] ACTION: createGame started. Max players:", maxPlayers, "Initial playerSessionId:", this.playerSessionId);
            this.loading = true; this.error = null;
            try {
                const response = await apiService.createGame(maxPlayers);
                console.log("[gameStore] createGame API response received:", JSON.parse(JSON.stringify(response.data)));
                if (response.data.success && response.data.game_code && response.data.game_id) { // 更严格的成功条件检查
                    this._updateStateFromResponse(response.data, "createGame_api_success");
                    const playerName = localStorage.getItem('playerName') || `房主_${this.playerSessionId?.substring(0,4) || '新'}`;
                    console.log(`[gameStore] createGame success. STORE state: gameId=${this.gameId}, gameCode=${this.gameCode}, playerSessionId=${this.playerSessionId}`);
                    console.log(`[gameStore] Attempting auto-join with code: '${this.gameCode}' as player: '${playerName}'`);
                    
                    await this.joinGame(this.gameCode, playerName); 
                    
                    if (this.error) { 
                        console.error("[gameStore] Auto-join after createGame FAILED. Error from joinGame:", this.error);
                        // 保留已创建的房间信息，让用户知道创建是成功的，但加入有问题
                    } else {
                        console.log("[gameStore] Auto-join after createGame successful.");
                    }
                } else {
                    this.error = response.data.error || '创建房间失败 (API response indicates failure or missing data)';
                    console.error("[gameStore] createGame API FAILED:", this.error, "Response data:", JSON.parse(JSON.stringify(response.data)));
                    this.clearGameData(); // 清理状态，因为创建本身就有问题
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '创建房间请求发生网络或未知错误';
                console.error("[gameStore] createGame CATCH block error:", this.error, err);
                this.clearGameData();
            } finally {
                this.loading = false;
                console.log("[gameStore] ACTION: createGame finished. Loading:", this.loading, "Error:", this.error, "GameID:", this.gameId);
            }
        },
        async joinGame(gameCode, playerName) {
            console.log(`[gameStore] ACTION: joinGame started. Code: '${gameCode}', Name: '${playerName}', SessionId: '${this.playerSessionId}'`);
            this.loading = true; 
            let joinAttemptError = null; 
            try {
                if (!gameCode || !playerName) {
                    joinAttemptError = "加入房间信息不完整 (缺少房间码或昵称)"; throw new Error(joinAttemptError);
                }
                const response = await apiService.joinGame(gameCode, playerName);
                console.log("[gameStore] joinGame API response received:", JSON.parse(JSON.stringify(response.data)));
                if (response.data.success && response.data.game_id) { // 确保 game_id 也返回了
                    this._updateStateFromResponse(response.data, "joinGame_api_success");
                    if (gameCode && (!this.gameCode || this.gameCode !== gameCode)) {
                        this.gameCode = gameCode; localStorage.setItem('currentGameCode', this.gameCode);
                    }
                    await this.fetchGameState(true); 
                    this.startPolling();
                    this.error = null; // 清除旧错误，因为加入成功
                    console.log("[gameStore] joinGame successful. Fetched game state.");
                } else {
                    joinAttemptError = response.data.error || '加入房间失败 (API response indicates failure)'; 
                    throw new Error(joinAttemptError);
                }
            } catch (err) {
                this.error = joinAttemptError || err.message || '加入房间请求发生网络或未知错误';
                console.error("[gameStore] joinGame CATCH block error:", this.error, err);
                // 如果加入失败，可能不需要完全 clearGameData，特别是如果是自动加入流程，错误应该由 createGame 处理
            } finally {
                this.loading = false;
                console.log("[gameStore] ACTION: joinGame finished. Loading:", this.loading, "Error:", this.error, "GameID:", this.gameId);
            }
        },
        async fetchGameState(forceUpdateLoading = false) {
            // ... (与上一版包含日志的版本相同) ...
        },
        // ... (其他actions: startGame, submitHand, leaveGame, resetForNewRound, startPolling, stopPolling, clearGameData, tryRestoreSession 与上一版相同) ...
    }
});
