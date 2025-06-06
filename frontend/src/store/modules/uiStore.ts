import { defineStore } from 'pinia';

interface UIState {
  isChatWindowOpen: boolean;
  isScoreBoardVisible: boolean;
  isLoadingGlobally: boolean; // 全局加载状态
  // ... 其他UI状态
}

export const useUIStore = defineStore('ui', {
  state: (): UIState => ({
    isChatWindowOpen: false,
    isScoreBoardVisible: true,
    isLoadingGlobally: false,
  }),
  actions: {
    toggleChatWindow() {
      this.isChatWindowOpen = !this.isChatWindowOpen;
    },
    showScoreBoard(visible: boolean) {
      this.isScoreBoardVisible = visible;
    },
    setGlobalLoading(isLoading: boolean) {
      this.isLoadingGlobally = isLoading;
    },
  },
});
