// frontend/src/stores/gameStore.js
import { defineStore } from 'pinia';
import apiService from '../services/apiService';

export const useGameStore = defineStore('game', {
    state: () => ({
        myCards: [],     // 核心：当前玩家的手牌
        playerSessionId: localStorage.getItem('playerSessionId') || null, // 仍然需要会话ID
        error: null,
        loading: false,
        // 移除了 gameId, gameCode, gameState, players, pollingInterval, lastPollFailed
    }),
    getters: {
        // 可以保留一些基础的 getter，如果需要
        isLoading: (state) => state.loading,
        hasError: (state) => !!state.error,
    },
    actions: {
        // 更新 playerSessionId (如果后端返回了新的)
        _updateSessionId(sessionId) {
            if (sessionId && this.playerSessionId !== sessionId) {
                this.playerSessionId = sessionId;
                localStorage.setItem('playerSessionId', sessionId);
                // console.log("[gameStore Simplified] Updated playerSessionId:", this.playerSessionId);
            }
        },

        // 获取初始手牌的 action
        async fetchInitialHand() {
            // console.log("[gameStore Simplified] ACTION: fetchInitialHand started.");
            this.loading = true;
            this.error = null;
            try {
                const response = await apiService.getInitialDeal();
                // console.log("[gameStore Simplified] fetchInitialHand API response:", response.data);
                if (response.data.success && Array.isArray(response.data.my_cards)) {
                    this.myCards = response.data.my_cards;
                    this._updateSessionId(response.data.player_session_id); // 更新会话ID
                    // console.log("[gameStore Simplified] fetchInitialHand success. My cards count:", this.myCards.length);
                } else {
                    this.error = response.data.error || '获取初始手牌失败 (API no success)';
                    this.myCards = [];
                    // console.error("[gameStore Simplified] fetchInitialHand API no success:", this.error);
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '获取初始手牌请求错误';
                this.myCards = [];
                // console.error("[gameStore Simplified] fetchInitialHand CATCH error:", this.error, err);
            } finally {
                this.loading = false;
                // console.log("[gameStore Simplified] ACTION: fetchInitialHand finished. Loading:", this.loading, "Error:", this.error);
            }
        },

        // 简化的提交牌型 action
        async submitArrangedHand(front, mid, back) {
            // console.log("[gameStore Simplified] ACTION: submitArrangedHand started.");
            this.loading = true;
            this.error = null;
            try {
                // 将原始手牌传给后端做校验（可选，但更安全）
                const response = await apiService.submitPlayerHandSimple(front, mid, back, this.myCards);
                // console.log("[gameStore Simplified] submitArrangedHand API response:", response.data);
                if (response.data.success) {
                    alert("牌型已提交 (简化模式)！"); // 简单提示
                    this._updateSessionId(response.data.player_session_id);
                    // 在简化模式下，提交后可能不需要做太多状态更新，除非你想显示已提交的牌
                } else {
                    this.error = response.data.error || '提交牌型失败 (API no success)';
                    alert(`提交失败: ${this.error}`);
                }
            } catch (err) {
                this.error = err.response?.data?.error || err.message || '提交牌型请求错误';
                alert(`提交请求错误: ${this.error}`);
            } finally {
                this.loading = false;
            }
        },

        // 清理数据的 action (简化版)
        clearCoreData() {
            // console.log("[gameStore Simplified] ACTION: clearCoreData called.");
            this.myCards = [];
            this.error = null;
            this.loading = false;
            // playerSessionId 和 localStorage 中的 playerSessionId 通常应该保留，除非用户想完全重置
        }
    }
});
