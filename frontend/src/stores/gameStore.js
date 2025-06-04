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
        // ... (getters 与上一版相同) ...
        isGameActive: (state) => !!state.gameId && state.gameState && state.gameState.status !== 'finished',
        myPlayerDetails: (state) => state.players.find(p => p.is_me === true),
        canStartGame(state) {
            if (!this.myPlayerDetails) return false;
            if (!state.gameState || state.gameState.status !== 'waiting') return false;
            if (state.players.length < 2) return false;
            const isHost = this.myPlayerDetails.order === 1;
            const enoughPlayers = state.players.length >= 2 && state.players.length <= state.gameState.max_players;
            return isHost && enoughPlayers;
        },
        isMyTurnToSubmit: (state) => { /* ... */ },
        allPlayersReady: (state) => { /* ... */ },
    },
    actions: {
        // ... (_updateStateFromResponse, createGame, joinGame, startGame, fetchGameState, submitHand, resetForNewRound, startPolling, stopPolling 与上一版相同) ...
        _updateStateFromResponse(data) { /* ... (与上一版相同) ... */ },
        async createGame(maxPlayers = 4) { /* ... (与上一版相同) ... */ },
        async joinGame(gameCode, playerName) { /* ... (与上一版相同) ... */ },
        async startGame() { /* ... (与上一版相同) ... */ },
        async fetchGameState(forceUpdateLoading = false) { /* ... (与上一版相同) ... */ },
        async submitHand(front, mid, back) { /* ... (与上一版相同) ... */ },
        async resetForNewRound() { /* ... (与上一版相同) ... */ },
        startPolling() { /* ... (与上一版相同) ... */ },
        stopPolling() { /* ... (与上一版相同) ... */ },


        // 新增：离开游戏 action
        async leaveGame() {
            if (!this.gameId) {
                // console.warn("Attempted to leave game, but no gameId in store.");
                this.clearGameData(); // 如果没有gameId，也清理一下前端状态
                return;
            }
            this.loading = true;
            this.error = null;
            try {
                const response = await apiService.leaveGame(this.gameId);
                if (response.data.success) {
                    // console.log("Successfully left game:", response.data.message);
                    this.clearGameData(); // 离开成功后，清理前端游戏数据
                } else {
                    this.error = response.data.error || '离开房间失败';
                    // 根据错误类型决定是否清理数据，例如如果错误是“你已不在房间”，也应该清理
                    if (response.data.error && response.data.error.includes("已不在该房间中")) {
                        this.clearGameData();
                    }
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '离开房间请求错误';
                // 如果网络错误等，可能不清理数据，让用户重试或显示错误
            } finally {
                this.loading = false;
            }
        },

        clearGameData() {
            this.stopPolling();
            this.gameId = null;
            this.gameCode = null;
            this.gameState = null;
            this.players = [];
            this.myCards = [];
            this.myPlayerId = null;
            // this.error = null; // 保留错误信息以便用户看到
            this.loading = false;
            localStorage.removeItem('currentGameId');
            localStorage.removeItem('currentGameCode');
            // playerSessionId 通常应该保留，除非用户明确想重置会话
        },
        async tryRestoreSession() {
             if (this.playerSessionId && this.gameId) {
                await this.fetchGameState(true);
                if (this.isGameActive) {
                    this.startPolling();
                } else if (!this.gameState){
                    this.clearGameData();
                }
            } else {
                this.clearGameData();
            }
        }
    }
});
