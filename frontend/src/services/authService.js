// frontend_react/src/services/authService.js
const mockUserDatabase = [];
const mockUserPoints = {};
const mockActiveTokens = {};
let nextUserIdCounter = 1000;

const generateUniqueId = () => {
  if (nextUserIdCounter > 9999) nextUserIdCounter = 1000;
  return nextUserIdCounter++;
};
const generateToken = () => Math.random().toString(36).substr(2) + Date.now().toString(36);
const simulateDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

export const authService = {
  register: async ({ phone, password }) => { /* ... logic ... */ return { user: { phone, id, points: mockUserPoints[id] }, token }; },
  login: async ({ phone, password }) => { /* ... logic ... */ return { user: { phone: user.phone, id: user.id, points: mockUserPoints[user.id] || 0 }, token }; },
  logout: async (token) => { /* ... logic ... */ return { success: true }; },
  getUserProfile: async (token) => { /* ... logic ... */ return { phone: user.phone, id: user.id, points: mockUserPoints[user.id] || 0 }; },
  transferPoints: async ({ fromUserId, toPhone, toId, amount, token }) => { /* ... logic ... */ return { success: true, newFromUserPoints: mockUserPoints[fromUserId] }; },
  checkAuthStatus: async (token) => { /* ... logic ... */ return { phone: user.phone, id: user.id, points: mockUserPoints[user.id] || 0 }; }
};
