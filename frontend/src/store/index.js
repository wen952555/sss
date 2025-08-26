// frontend/src/store/index.js
import { create } from 'zustand';

export const useStore = create((set) => ({
  // Game State
  gameState: null,
  arrangedHumanHand: { tou: [], zhong: [], wei: [] },
  showComparisonModal: false,
  selectedCardsInfo: [],
  isLoadingApp: true,

  // Auth State
  currentUser: null,
  showAuthModal: false,
  showProfilePage: false,

  // Game Mode
  gameMode: 'singlePlayer',
  currentRoomId: null,

  // Actions
  setGameState: (gameState) => set({ gameState }),
  setArrangedHumanHand: (arrangedHumanHand) => set({ arrangedHumanHand }),
  setShowComparisonModal: (showComparisonModal) => set({ showComparisonModal }),
  setSelectedCardsInfo: (selectedCardsInfo) => set({ selectedCardsInfo }),
  setIsLoadingApp: (isLoadingApp) => set({ isLoadingApp }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setShowAuthModal: (showAuthModal) => set({ showAuthModal }),
  setShowProfilePage: (showProfilePage) => set({ showProfilePage }),
  setGameMode: (gameMode) => set({ gameMode }),
  setCurrentRoomId: (currentRoomId) => set({ currentRoomId }),
}));
