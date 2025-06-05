// frontend/src/stores/gameStore.js
import { defineStore } from 'pinia';
import apiService from '../services/apiService'; // 确保路径正确

export const useGameStore = defineStore('game', {
    state: () => ({
        myCards: [],     // 存储获取到的手牌
        playerSessionId: localStorage.getItem('playerSessionId') || null,
        error: null,
        loading: false,
        // 移除了与多人游戏相关的状态
    }),
    getters: {
        isLoading: (state) => state.loading,
        hasError: (state) => !!state.error,
        currentHand: (state) => state.myCards, // Getter 方便组件访问手牌
    },
    actions: {
        _updateSessionId(sessionId) {
            if (sessionId && this.playerSessionId !== sessionId) {
                this.playerSessionId = sessionId;
                localStorage.setItem('playerSessionId', sessionId);
            }
        },
        async fetchInitialHand() {
            // console.log("[gameStore] ACTION: fetchInitialHand started.");
            this.loading = true;
            this.error = null;
            this.myCards = []; // 获取前先清空旧牌
            try {
                const response = await apiService.getInitialDeal();
                // console.log("[gameStore] fetchInitialHand API response:", response.data);
                if (response.data.success && Array.isArray(response.data.my_cards)) {
                    this.myCards = response.data.my_cards;
                    this._updateSessionId(response.data.player_session_id);
                    // console.log("[gameStore] fetchInitialHand success. My cards count:", this.myCards.length);
                } else {
                    this.error = response.data.error || '获取初始手牌失败';
                    // console.error("[gameStore] fetchInitialHand API error:", this.error);
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '获取初始手牌请求错误';
                // console.error("[gameStore] fetchInitialHand CATCH error:", this.error, err);
            } finally {
                this.loading = false;
                // console.log("[gameStore] ACTION: fetchInitialHand finished.");
            }
        },
        // 暂时不需要其他 actions
    }
});
