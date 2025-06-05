// frontend/src/stores/gameStore.js
// ... (state, getters 与上一版相同，确保 myPlayerDetails 和 isGameActive 等正确) ...

export const useGameStore = defineStore('game', {
    // ...
    actions: {
        // ... (_updateStateFromResponse, createGame, joinGame, fetchGameState, startGame 与上一版相同) ...

        async submitHand(front, mid, back) {
            console.log("[gameStore] ACTION: submitHand started."); // 日志 A
            if (!this.gameId || !this.myPlayerId) {
                this.error = "无法提交牌型：游戏或玩家信息丢失。";
                console.error("[gameStore] submitHand REJECTED:", this.error); // 日志 B
                return;
            }
            if (this.myPlayerDetails && this.myPlayerDetails.is_ready) { // 再次检查是否已提交
                this.error = "您已经提交过牌型了。";
                console.warn("[gameStore] submitHand REJECTED: Already submitted."); // 日志 C
                return;
            }

            this.loading = true; 
            this.error = null;
            try {
                console.log("[gameStore] submitHand: Calling apiService.submitHand with gameId:", this.gameId); // 日志 D
                const response = await apiService.submitHand(this.gameId, front, mid, back);
                console.log("[gameStore] submitHand API response received:", JSON.parse(JSON.stringify(response.data))); // 日志 E

                if (response.data.success) {
                    console.log("[gameStore] submitHand API success. Fetching game state..."); // 日志 F
                    await this.fetchGameState(true); // 提交成功后，获取最新游戏状态
                    console.log("[gameStore] submitHand: Game state fetched after submission."); // 日志 G
                } else { 
                    this.error = response.data.error || '提交牌型失败 (API no success)'; 
                    console.error("[gameStore] submitHand API FAILED:", this.error, "Response:", JSON.parse(JSON.stringify(response.data))); // 日志 H
                }
            } catch (err) { 
                this.error = err.response?.data?.error || err.message || '提交牌型请求发生网络或未知错误'; 
                console.error("[gameStore] submitHand CATCH block error:", this.error, err); // 日志 I
            }
            finally { 
                this.loading = false; 
                console.log("[gameStore] ACTION: submitHand finished. Loading:", this.loading, "Error:", this.error); // 日志 J
            }
        },
        // ... (leaveGame, resetForNewRound, startPolling, stopPolling, clearGameData, tryRestoreSession 与上一版相同) ...
    }
});
