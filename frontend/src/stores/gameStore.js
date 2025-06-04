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
            if (!this.myPlayerDetails) { console.warn("[gameStore] canStartGame: myPlayerDetails is falsy", state.players, state.playerSessionId); return false; }
            if (!state.gameState || state.gameState.status !== 'waiting') { console.warn("[gameStore] canStartGame: game not waiting or gameState missing", state.gameState); return false; }
            if (state.players.length < 2) { console.warn("[gameStore] canStartGame: not enough players", state.players.length); return false; }
            const isHost = this.myPlayerDetails.order === 1;
            const enoughPlayers = state.players.length >= 2 && state.players.length <= state.gameState.max_players;
            // console.log(`[gameStore] canStartGame final check: isHost=${isHost}, enoughPlayers=${enoughPlayers}`);
            return isHost && enoughPlayers;
        },
        isMyTurnToSubmit: (state) => { /* ... */ },
        allPlayersReady: (state) => { /* ... */ },
    },
    actions: {
        _updateStateFromResponse(data) {
            console.log("[gameStore] _updateStateFromResponse called with data:", data); // DEBUG LOG
            if (data.game_id !== undefined) { // Check for undefined to allow null
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
                console.log("[gameStore] Updated playerSessionId:", this.playerSessionId); // DEBUG LOG
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
            console.log("[gameStore] createGame action started. Max players:", maxPlayers); // DEBUG LOG
            this.loading = true; this.error = null;
            try {
                const response = await apiService.createGame(maxPlayers);
                console.log("[gameStore] createGame API response:", response); // DEBUG LOG
                if (response.data.success) {
                    this._updateStateFromResponse(response.data); // gameId, gameCode, playerSessionId set here
                    const playerName = localStorage.getItem('playerName') || `房主_${this.playerSessionId?.substring(0,4) || '新玩家'}`;
                    console.log("[gameStore] createGame success. Now attempting to join game as:", playerName); // DEBUG LOG
                    await this.joinGame(this.gameCode, playerName); // joinGame will call fetchGameState and startPolling
                } else {
                    this.error = response.data.error || '创建房间失败 (API no success)';
                    console.error("[gameStore] createGame API no success:", this.error); // DEBUG LOG
                    this.clearGameData();
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '创建房间请求发生错误';
                console.error("[gameStore] createGame catch error:", this.error, err); // DEBUG LOG
                this.clearGameData();
            } finally {
                this.loading = false;
                console.log("[gameStore] createGame action finished. Loading:", this.loading, "Error:", this.error); // DEBUG LOG
            }
        },
        // ... (joinGame, startGame, fetchGameState, submitHand, leaveGame, resetForNewRound, startPolling, stopPolling, clearGameData, tryRestoreSession 与上一版相同，但可按需加入更多日志) ...
        async joinGame(gameCode, playerName) { /* ... */ },
        async startGame() { /* ... */ },
        async fetchGameState(forceUpdateLoading = false) { /* ... */ },
        async submitHand(front, mid, back) { /* ... */ },
        async leaveGame() { /* ... (与上一版相同) ... */ },
        async resetForNewRound() { /* ... */ },
        startPolling() { /* ... */ },
        stopPolling() { /* ... */ },
        clearGameData() { /* ... (与上一版相同) ... */ },
        async tryRestoreSession() { /* ... (与上一版相同) ... */ }
    }
});
