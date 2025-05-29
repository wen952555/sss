import axios from 'axios';

// For local development, VITE_API_BASE_URL will likely not be set in .env.local,
// so API_BASE_URL will default to '/api', which Vite will proxy.
// For production builds (on Cloudflare Pages), VITE_API_BASE_URL will be set from
// Cloudflare Pages environment variables to your actual backend URL.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for sending session cookies cross-domain (HTTPS required)
  headers: {
    'Content-Type': 'application/json',
  }
});

// Optional: Interceptors (no change from before)
// apiClient.interceptors.request.use(config => { ... });
// apiClient.interceptors.response.use(response => response, error => { ... });

export default {
  // Auth
  register(credentials) {
    return apiClient.post('/auth/register', credentials);
  },
  login(credentials) {
    return apiClient.post('/auth/login', credentials);
  },
  logout() {
    return apiClient.post('/auth/logout');
  },
  checkAuthStatus() {
    return apiClient.get('/auth/status');
  },

  // Rooms
  createRoom() {
    // No prefix needed, apiClient's baseURL already has /backend/
    return apiClient.post('/rooms/create');
  },
  joinRoom(roomCode) {
    return apiClient.post('/rooms/join', { roomCode });
  },

  // Game
  startGame(roomId) {
    return apiClient.post(`/game/${roomId}/start`);
  },
  getPlayerHand(gameId) {
    return apiClient.get(`/game/${gameId}/hand`);
  },
  submitArrangement(gameId, arrangement) {
    return apiClient.post(`/game/${gameId}/arrange`, { arrangement });
  },
  getGameState(gameId) {
    return apiClient.get(`/game/${gameId}/state`);
  }
};
