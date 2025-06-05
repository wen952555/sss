// frontend/src/stores/gameStore.js
import { defineStore } from 'pinia';
import apiService from '../services/apiService';

export const useGameStore = defineStore('game', {
    state: () => ({ /* ... (与上一版相同) ... */ }),
    getters: { /* ... (与上一版相同) ... */ },
    actions: {
        _updateStateFromResponse(data, source = "unknown") {
            // console.log(`[STORE _update] (from ${source}) data:`, JSON.parse(JSON.stringify(data)));
            if (data.player_session_id && (!this.playerSessionId || this.playerSessionId !== data.player_session_id)) {
                this.playerSessionId = data.player_session_id;
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
            if (data.game_state) this.gameState = data.game_state;
            
            let foundMe = false;
            if (Array.isArray(data.players)) {
                this.players = data.players.map(p => ({ ...p, is_me: p.session_id === this.playerSessionId }));
                const me = this.players.find(p => p.is_me);
                if (me) {
                    foundMe = true;
                    this.myPlayerId = me.id;
                    // 关键: 确保从 'me' 对象中正确获取 my_cards
                    // 后端应该在 get_game_state 时，如果 is_me 为 true，则在玩家对象中包含 my_cards 字段
                    if (Array.isArray(me.my_cards)) {
                        this.myCards = me.my_cards;
                        // console.log(`[STORE _update] Updated myCards for player ${me.id} (from ${source}):`, JSON.parse(JSON.stringify(this.myCards)));
                    } else {
                        // 如果 me 对象存在，但 my_cards 不是数组 (或不存在)，则清空
                        this.myCards = [];
                        // console.log(`[STORE _update] my_cards was not an array or undefined in 'me' object from ${source}. Cleared myCards.`);
                    }
                }
            }
            
            // 如果更新后找不到当前玩家，或者没有玩家数据，则清空手牌
            if (!foundMe || !Array.isArray(data.players) || data.players.length === 0) {
                if (source.includes("fetchGameState")) { // 只有当是获取状态时才清空，避免其他操作错误清空
                    this.myCards = [];
                    this.myPlayerId = null; // 如果 players 列表为空，myPlayerId 也应为空
                    // console.warn(`[STORE _update] 'me' not found or no players array from ${source}. Cleared myCards and myPlayerId.`);
                }
            }
            // console.log(`[STORE _update] Finished. myCards length: ${this.myCards.length}`);
        },
        // ... (所有其他 actions: createGame, joinGame, fetchGameState, startGame, submitHand, leaveGame, resetForNewRound, startPolling, stopPolling, clearGameData, tryRestoreSession 与上一轮相同，确保它们正确调用 _updateStateFromResponse 和其他 actions)
    }
});
