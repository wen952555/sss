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
        canStartGame(state) { /* ... (与上一版相同) ... */ },
        isMyTurnToSubmit: (state) => { /* ... */ },
        allPlayersReady: (state) => { /* ... */ },
    },
    actions: {
        _updateStateFromResponse(data) {
            console.log("[gameStore] _updateStateFromResponse called with data:", JSON.parse(JSON.stringify(data)));
            if (data.game_id !== undefined) {
                this.gameId = data.game_id;
                if (data.game_id) localStorage.setItem('currentGameId', this.gameId);
                else localStorage.removeItem('currentGameId');
            }
            if (data.game_code !== undefined) {
                this.gameCode = data.game_code;
                 if (data.game_code) localStorage.setItem('currentGameCode', this.gameCode);
                else localStorage.removeItem('currentGameCode');
                console.log("[gameStore] Updated gameCode from response:", this.gameCode);
            }
            if (data.player_session_id && (!this.playerSessionId || this.playerSessionId !== data.player_session_id)) {
                this.playerSessionId = data.player_session_id;
                localStorage.setItem('playerSessionId', this.playerSessionId);
                console.log("[gameStore] Updated playerSessionId:", this.playerSessionId);
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
                    console.warn("[gameStore] _updateStateFromResponse: Could not find 'me' in players list. Current session ID:", this.playerSessionId, "Players:", data.players);
                }
            }
        },
        async createGame(maxPlayers = 4) {
            console.log("[gameStore] createGame action started. Max players:", maxPlayers, "Current playerSessionId:", this.playerSessionId);
            this.loading = true; this.error = null;
            try {
                const response = await apiService.createGame(maxPlayers);
                console.log("[gameStore] createGame API response:", JSON.parse(JSON.stringify(response.data)));
                if (response.data.success) {
                    this._updateStateFromResponse(response.data); // gameId, gameCode, playerSessionId set here
                    const playerName = localStorage.getItem('playerName') || `房主_${this.playerSessionId?.substring(0,4) || '新玩家'}`;
                    console.log(`[gameStore] createGame success. STORE state after update: gameId=${this.gameId}, gameCode=${this.gameCode}, playerSessionId=${this.playerSessionId}`);
                    console.log(`[gameStore] Now attempting to auto-join game with code: '${this.gameCode}' as player: '${playerName}'`);
                    
                    // 确保 this.gameCode 有效再调用 joinGame
                    if (!this.gameCode) {
                        this.error = "创建房间后未能获取到房间码，无法自动加入。";
                        console.error(this.error);
                        this.clearGameData(); // 清理不完整的状态
                        return; // 提前退出
                    }
                    await this.joinGame(this.gameCode, playerName); // joinGame will call fetchGameState and startPolling
                    
                    if (this.error) { // 检查 joinGame 是否设置了错误
                        console.error("[gameStore] Auto-join after createGame failed:", this.error);
                        // 此时 createGame 本身是成功的，但 joinGame 失败了。
                        // 可能需要决定是清理状态还是保留创建的房间让用户尝试手动加入。
                        // 为了简单，如果自动加入失败，也清理状态。
                        // this.clearGameData(); // 或者只清除部分状态，保留 gameCode 让用户看到
                    } else {
                        console.log("[gameStore] Auto-join after createGame seems successful.");
                    }

                } else {
                    this.error = response.data.error || '创建房间失败 (API no success)';
                    console.error("[gameStore] createGame API no success:", this.error);
                    this.clearGameData();
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '创建房间请求发生错误';
                console.error("[gameStore] createGame catch error:", this.error, err);
                this.clearGameData();
            } finally {
                this.loading = false;
                console.log("[gameStore] createGame action finished. Loading:", this.loading, "Error:", this.error);
            }
        },
        async joinGame(gameCode, playerName) {
            console.log(`[gameStore] joinGame action started. Code: '${gameCode}', Name: '${playerName}', Current playerSessionId: '${this.playerSessionId}'`);
            this.loading = true; 
            // 不立即清除错误，以便 createGame 中的 joinGame 失败时能看到 createGame 的错误（如果之前有）
            // this.error = null; 
            let joinError = null; // 局部错误变量

            try {
                if (!gameCode || !playerName) {
                    joinError = "加入房间失败：缺少房间码或玩家昵称。";
                    console.error(joinError);
                    this.error = joinError; // 设置全局错误
                    return; // 直接返回
                }
                const response = await apiService.joinGame(gameCode, playerName);
                console.log("[gameStore] joinGame API response:", JSON.parse(JSON.stringify(response.data)));
                if (response.data.success) {
                    this._updateStateFromResponse(response.data);
                    // 确保 gameCode 在这里也被正确设置
                    if (gameCode && (!this.gameCode || this.gameCode !== gameCode)) {
                        this.gameCode = gameCode; // 如果后端join不返回gameCode，或为了统一
                        localStorage.setItem('currentGameCode', this.gameCode);
                        console.log("[gameStore] Set/Confirmed gameCode in joinGame:", this.gameCode);
                    }
                    await this.fetchGameState(true); // 获取最新状态
                    this.startPolling(); // 开始轮询
                    this.error = null; // 加入成功，清除之前的错误（如果有）
                    console.log("[gameStore] joinGame successful.");
                } else {
                    joinError = response.data.error || '加入房间失败 (API no success)';
                    console.error("[gameStore] joinGame API no success:", joinError);
                    this.error = joinError; // 设置全局错误
                }
            } catch (err) {
                joinError = err.response?.data?.error || err.message || '加入房间请求发生错误';
                console.error("[gameStore] joinGame catch error:", joinError, err);
                this.error = joinError; // 设置全局错误
            } finally {
                this.loading = false;
                console.log("[gameStore] joinGame action finished. Loading:", this.loading, "Error set to:", this.error);
            }
        },
        // ... (startGame, fetchGameState, submitHand, leaveGame, resetForNewRound, startPolling, stopPolling, clearGameData, tryRestoreSession 与上一版相同) ...
        async startGame() { /* ... */ },
        async fetchGameState(forceUpdateLoading = false) { /* ... */ },
        async submitHand(front, mid, back) { /* ... */ },
        async leaveGame() { /* ... */ },
        async resetForNewRound() { /* ... */ },
        startPolling() { /* ... */ },
        stopPolling() { /* ... */ },
        clearGameData() { /* ... */ },
        async tryRestoreSession() { /* ... */ }
    }
});
