// frontend_react/src/services/authService.js

// --- Mock Service for Offline Mode ---

export const authService = {
  checkAuthStatus: () => Promise.resolve(null),
  login: () => Promise.resolve(null),
  register: () => Promise.resolve(null),
  logout: () => Promise.resolve(),
};
