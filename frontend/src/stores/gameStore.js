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
    getters: { /* ... (与上一轮修复 defineStore 错误后的版本相同) ... */ },
    actions: {
        _updateStateFromResponse(data, source = "unknown") {
            console.log(`[gameStore DEBUG] _updateStateFromResponse (from ${source}) data:`, JSON.parse(JSON.stringify(data)));
            // ... (其余逻辑与上一轮修复 defineStore 错误后的版本相同)
        },
        async createGame(maxPlayers = 4) {
            console.log(`[gameStore DEBUG] ACTION: createGame started. Max players: ${maxPlayers}, Initial playerSessionId: ${this.playerSessionId}`);
            this.loading = true; this.error = null;
            try {
                const response = await apiService.createGame(maxPlayers);
                console.log("[gameStore DEBUG] createGame API response received:", JSON.parse(JSON.stringify(response))); // Log a copy
                if (response.data && response.data.success && response.data.game_code && response.data.game_id) {
                    console.log("[gameStore DEBUG] createGame API success. Data:", JSON.parse(JSON.stringify(response.data)));
                    this._updateStateFromResponse(response.data, "createGame_api_success");
                    const playerName = localStorage.getItem('playerName') || `房主_${this.playerSessionId?.substring(0,4) || '新'}`;
                    
                    if (!this.gameCode) {
                        this.error = "创建房间后未能获取房间码。"; 
                        console.error("[gameStore DEBUG] Error after createGame success (no gameCode):", this.error);
                        throw new Error(this.error); // Propagate error
                    }
                    console.log(`[gameStore DEBUG] Attempting auto-join with code: '${this.gameCode}' as player: '${playerName}'`);
                    await this.joinGame(this.gameCode, playerName); 
                    
                    if (this.error) { 
                        console.error("[gameStore DEBUG] Auto-join after createGame FAILED. Error from joinGame:", this.error);
                        // throw new Error(`自动加入房间失败: ${this.error}`); //让createGame的error被这个覆盖
                    } else {
                        console.log("[gameStore DEBUG] Auto-join after createGame successful.");
                    }
                } else {
                    this.error = response.data?.error || '创建房间失败 (API response indicates failure or missing data)';
                    console.error("[gameStore DEBUG] createGame API FAILED:", this.error, "Full Response:", JSON.parse(JSON.stringify(response)));
                    throw new Error(this.error); // Propagate error
                }
            } catch (err) {
                // If error was already set by a deeper throw, use that, otherwise use generic.
                if (!this.error) {
                    this.error = err.message || '创建房间请求发生未知错误';
                }
                console.error("[gameStore DEBUG] createGame CATCH block error:", this.error, err);
                // Do not clearGameData here if create succeeded but join failed, to preserve gameCode for user
                if (!(err.message && err.message.startsWith("自动加入房间失败"))) { //只有在create_game本身失败时才清理
                    this.clearGameData();
                }
            } finally {
                this.loading = false;
                console.log(`[gameStore DEBUG] ACTION: createGame finished. Loading: ${this.loading}, Error: ${this.error}, GameID: ${this.gameId}`);
            }
        },
        async joinGame(gameCode, playerName) {
            console.log(`[gameStore DEBUG] ACTION: joinGame started. Code: '${gameCode}', Name: '${playerName}', SessionId: '${this.playerSessionId}'`);
            this.loading = true; 
            // Important: Do not clear global this.error here if called from createGame, 
            // as createGame might have its own error to report if joinGame is part of it.
            // Let's use a local error for this specific attempt.
            let joinAttemptError = null;
            try {
                if (!gameCode || !playerName) {
                    joinAttemptError = "加入房间信息不完整 (缺少房间码或昵称)"; throw new Error(joinAttemptError);
                }
                const response = await apiService.joinGame(gameCode, playerName);
                console.log("[gameStore DEBUG] joinGame API response received:", JSON.parse(JSON.stringify(response.data)));
                if (response.data && response.data.success && response.data.game_id) {
                    this._updateStateFromResponse(response.data, "joinGame_api_success");
                    if (gameCode && (!this.gameCode || this.gameCode !== gameCode)) {
                        this.gameCode = gameCode; localStorage.setItem('currentGameCode', this.gameCode);
                    }
                    await this.fetchGameState(true); 
                    this.startPolling();
                    // Only clear error if this joinGame call itself was successful.
                    // If part of createGame, createGame's error will be the final one.
                    // this.error = null; // This might clear createGame's error prematurely
                    console.log("[gameStore DEBUG] joinGame successful. Fetched game state.");
                } else {
                    joinAttemptError = response.data?.error || '加入房间失败 (API response indicates failure)'; 
                    throw new Error(joinAttemptError);
                }
            } catch (err) {
                this.error = joinAttemptError || err.message || '加入房间请求发生网络或未知错误'; // Set global error here
                console.error("[gameStore DEBUG] joinGame CATCH block error:", this.error, err);
            } finally {
                this.loading = false;
                console.log(`[gameStore DEBUG] ACTION: joinGame finished. Loading: ${this.loading}, Error: ${this.error}, GameID: ${this.gameId}`);
            }
        },
        // ... (其他 actions: fetchGameState, startGame, submitHand, leaveGame, resetForNewRound, startPolling, stopPolling, clearGameData, tryRestoreSession 与上一轮修复 defineStore 错误后的版本相同，确保日志开启)
        // 确保所有这些 action 的定义都在这里
    }
});
