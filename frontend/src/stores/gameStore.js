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
            console.log("[gameStore] Evaluating canStartGame..."); // 日志1: getter被调用

            if (!this.myPlayerDetails) { 
                console.warn("[gameStore] canStartGame REJECT: myPlayerDetails is falsy. Players:", JSON.parse(JSON.stringify(state.players)), "SessionID:", state.playerSessionId); 
                return false; 
            }
            console.log("[gameStore] canStartGame: myPlayerDetails exists:", JSON.parse(JSON.stringify(this.myPlayerDetails))); // 日志2: myPlayerDetails内容

            if (!state.gameState || typeof state.gameState.status === 'undefined' || typeof state.gameState.max_players === 'undefined') { 
                console.warn("[gameStore] canStartGame REJECT: gameState, gameState.status, or gameState.max_players is missing. gameState:", JSON.parse(JSON.stringify(state.gameState)));
                return false; 
            }
            console.log("[gameStore] canStartGame: gameState exists. Status:", state.gameState.status, "MaxPlayers:", state.gameState.max_players); // 日志3: gameState内容

            if (state.gameState.status !== 'waiting') {
                console.warn("[gameStore] canStartGame REJECT: game status is not 'waiting'. Actual status:", state.gameState.status);
                return false;
            }

            const isHost = this.myPlayerDetails.order === 1;
            const isFull = state.players.length === state.gameState.max_players;
            
            console.log(`[gameStore] canStartGame Check: isHost=${isHost} (myOrder=${this.myPlayerDetails.order}), isFull=${isFull} (players.length=${state.players.length}, max_players=${state.gameState.max_players})`); // 日志4: 判断条件值
            
            const result = isHost && isFull;
            console.log("[gameStore] canStartGame 최종 결과:", result); // 日志5: 最终结果
            return result;
        },
        isMyTurnToSubmit: (state) => { /* ... (与上一版相同) ... */ },
        allPlayersReady: (state) => { /* ... (与上一版相同) ... */ },
    },
    actions: {
        // ... (所有 actions 与上一版相同，确保它们能正确工作) ...
        _updateStateFromResponse(data, source = "unknown") { /* ... */ },
        async createGame(maxPlayers = 4) { /* ... */ },
        async joinGame(gameCode, playerName) { /* ... */ },
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
