// frontend_react/src/services/socketService.js

// --- Mock Service for Offline Mode ---

const mockSocket = {
  on: () => {},
  off: () => {},
  sendMessage: () => {},
  disconnect: () => {},
  connect: () => {},
  isConnected: () => false,
  storeSession: () => {},
  clearSession: () => {},
};

export const socketService = mockSocket;
