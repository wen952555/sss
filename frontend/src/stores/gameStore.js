// frontend/src/stores/gameStore.js
import { defineStore } from 'pinia';
import apiService from '../services/apiService'; // 确保路径正确

export const useGameStore = defineStore('game', {
    state: () => ({
        myCards: [],
        playerSessionId: localStorage.getItem('playerSessionId') || null,
        error: null,
        loading: false,
    }),
    getters: {
        isLoading: (state) => state.loading,
        hasError: (state) => !!state.error,
        currentHand: (state) => state.myCards,
    },
    actions: {
        _updateSessionId(sessionId) {
            if (sessionId && this.playerSessionId !== sessionId) {
                this.playerSessionId = sessionId;
                localStorage.setItem('playerSessionId', sessionId);
                // console.log("[gameStore Simplified] Updated playerSessionId:", this.playerSessionId);
            }
        },
        async fetchInitialHand() {
            console.log("[gameStore] ACTION: fetchInitialHand started. Current loading state:", this.loading); // 日志1
            if (this.loading) { // 防止重复点击
                console.warn("[gameStore] fetchInitialHand: Already loading, request skipped.");
                return;
            }
            this.loading = true;
            this.error = null;
            this.myCards = []; 
            try {
                console.log("[gameStore] fetchInitialHand: Calling apiService.getInitialDeal()"); // 日志2
                const response = await apiService.getInitialDeal();
                console.log("[gameStore] fetchInitialHand: API response received:", JSON.parse(JSON.stringify(response))); // 日志3 (包含status, headers等)
                
                if (response.data && response.data.success && Array.isArray(response.data.my_cards)) {
                    this.myCards = response.data.my_cards;
                    this._updateSessionId(response.data.player_session_id);
                    console.log("[gameStore] fetchInitialHand SUCCESS. My cards count:", this.myCards.length, "Cards:", JSON.parse(JSON.stringify(this.myCards))); // 日志4
                } else {
                    this.error = response.data.error || '获取初始手牌失败 (API no success or invalid data)';
                    console.error("[gameStore] fetchInitialHand API FAILED or invalid data:", this.error, "Response data:", response.data); // 日志5
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '获取初始手牌请求错误';
                console.error("[gameStore] fetchInitialHand CATCH error:", this.error, err); // 日志6
            } finally {
                this.loading = false;
                console.log("[gameStore] ACTION: fetchInitialHand finished. Loading:", this.loading, "Error:", this.error); // 日志7
            }
        },
        // 其他 actions (如 submitArrangedHand, clearCoreData) 可以保持上一版的简化模式
        async submitArrangedHand(front, mid, back) { /* ... */ },
        clearCoreData() { /* ... */ }
    }
});
