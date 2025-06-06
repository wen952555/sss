// frontend/src/store/game.js
// ... (import 和大部分 state, getters, actions 同前) ...

export const useGameStore = defineStore('game', {
  state: () => ({
    gameId: localStorage.getItem('thirteen_gameId') || null,
    playerId: localStorage.getItem('thirteen_playerId') || null,
    playerName: localStorage.getItem('thirteen_playerName') || '玩家',
    gameState: null,
    myHand: [],
    arrangedHand: {
      front: [],
      back: []
    },
    error: null,
    isLoading: false,
    pollingIntervalId: null,
  }),

  getters: { /* ... 同前 ... */ },

  actions: {
    // ... (setPlayerName, createGame, joinGame, fetchGameState, dealCards, submitArrangedHandInternal, moveCard, clearArrangedPilesForAuto - 同前) ...
    setPlayerName(name) { /* ... */ },
    async createGame(numPlayers) { /* ... */ },
    async joinGame(gameId) { /* ... */ },
    async fetchGameState() { /* ... */ },
    async dealCards() { /* ... */ },
    async submitArrangedHandInternal(handToSubmit) { /* ... */ },
    moveCard(cardToMove, fromPileName, toPileName, cardIndexInFromPile) { /* ... */ },
    clearArrangedPilesForAuto() { /* ... */ },

    // 新增 AI 分牌 action
    async aiArrangeHand() {
        if (!this.gameId || !this.playerId || this.myHand.length !== 13) {
            this.error = "手牌不完整，无法进行 AI 分牌。";
            return false;
        }
        // 确保所有牌都在 myHand 中
        this.clearArrangedPilesForAuto();
        if (this.myHand.length !== 13) { // 双重检查
            this.error = "清理墩位后手牌数量不正确，请重试。";
            return false;
        }

        this.isLoading = true;
        this.error = null;
        try {
            const currentHandIds = this.myHand.map(card => card.id);
            // 调用后端 AI 分牌 API
            const aiResult = await api.getAiArrangedHand(this.gameId, this.playerId, currentHandIds);

            if (aiResult.success && aiResult.arranged_hand) {
                const { front, middle, back } = aiResult.arranged_hand;
                // 验证后端返回的牌是否合法
                if (front.length !== 3 || middle.length !== 5 || back.length !== 5) {
                    throw new Error("AI 返回的牌墩数量不正确。");
                }
                const allAiCards = [...front, ...middle, ...back];
                if (new Set(allAiCards).size !== 13) {
                    throw new Error("AI 返回的牌张总数或有重复。");
                }
                // 确保返回的牌是玩家原有的牌
                const originalHandSet = new Set(currentHandIds);
                if (!allAiCards.every(cardId => originalHandSet.has(cardId))) {
                    throw new Error("AI 返回的牌张与玩家原手牌不符。");
                }

                // 更新本地牌墩 (需要将 card_id 转换为 card 对象)
                // 这是一个简化处理，理想情况下后端应该返回完整的卡牌对象，或者前端有一个映射
                // 假设 api.js 或后端返回的 aiResult.arranged_hand 中的牌已经是 card_id
                
                // 先清空本地手牌和墩
                this.myHand = [];
                this.arrangedHand.front = [];
                this.arrangedHand.back = [];

                // 从 currentHandIds (包含完整对象) 中找到对应的卡牌对象
                const findCardObj = (id) => currentHandIds.map(cardId => this.myHand.find(obj => obj.id === cardId) || this.gameState.players.find(p=>p.id === this.playerId).hand.find(obj => obj.id === cardId) ).find(obj => obj && obj.id === id);
                // 上面的 findCardObj 逻辑需要改进，因为 currentHandIds 是 ID 列表，而 this.myHand 是对象列表
                // 正确的方式是，AI 分牌后，后端直接返回三墩的卡牌对象数组，或者前端在接收到卡牌ID后，从原始手牌中重新构建对象数组。
                
                // 简单粗暴：AI分牌后，我们期望后端验证其合法性，前端直接应用
                // 假设后端返回的是 card_id 列表
                // 我们需要从原始的 this.myHand (在调用AI之前) 获取完整的卡牌对象
                const originalMyHandBeforeAi = [...this.myHand]; // 在调用 api 之前 this.myHand 应该是完整的13张对象

                this.arrangedHand.front = front.map(id => originalMyHandBeforeAi.find(c => c.id === id)).filter(Boolean);
                this.arrangedHand.back = back.map(id => originalMyHandBeforeAi.find(c => c.id === id)).filter(Boolean);
                this.myHand = middle.map(id => originalMyHandBeforeAi.find(c => c.id === id)).filter(Boolean); // 中墩牌放入 myHand

                // 再次校验数量，以防 find 失败
                if (this.arrangedHand.front.length !== 3 || this.myHand.length !== 5 || this.arrangedHand.back.length !== 5) {
                    console.error("AI分牌后，前端应用牌墩数量不匹配", this.arrangedHand.front, this.myHand, this.arrangedHand.back);
                    // 还原手牌到调用AI之前的状态，避免界面混乱
                    this.myHand = originalMyHandBeforeAi;
                    this.arrangedHand.front = [];
                    this.arrangedHand.back = [];
                    throw new Error("AI分牌结果在前端应用时出错。");
                }

                return true;
            } else {
                this.error = aiResult.error || "AI 分牌未能成功返回结果。";
                return false;
            }
        } catch (err) {
            this.error = err.message || "AI 分牌时发生网络或逻辑错误。";
            // 如果出错，尝试恢复手牌到 AI 调用前的状态
            if (this.myHand.length !== 13 && this.arrangedHand.front.length === 0 && this.arrangedHand.back.length === 0) {
                 // 假设在调用 AI 前，所有牌都在 this.myHand
                 // 这个恢复逻辑可能不完美，取决于错误发生的阶段
                 // gameStore.fetchGameState(); // 或者直接重新获取状态
            }
            return false;
        } finally {
            this.isLoading = false;
        }
    },

    // ... (startPolling, stopPolling, clearGameData, leaveGame - 同前) ...
    startPolling() { /* ... */ },
    stopPolling() { /* ... */ },
    clearGameData() { /* ... */ },
    async leaveGame() { /* ... */ }
  }
});
