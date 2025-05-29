import { defineStore } from 'pinia';
import api from '../services/api';
// import router from '../router'; // Router should not be a direct dependency of a store

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // Will hold { userId, username } or be null
    isLoggedIn: false,
    isAuthStatusResolved: false, // Tracks if initial auth check is done
    authError: null, // To store any authentication errors
  }),
  actions: {
    async login(credentials) {
      console.log("[AuthStore] login action called with credentials:", credentials?.username);
      this.authError = null; // Clear previous errors
      this.isAuthStatusResolved = false; // Reset resolved status during login attempt

      try {
        const response = await api.login(credentials);
        console.log("[AuthStore] login API response:", JSON.parse(JSON.stringify(response.data))); // Log data part

        if (response.data && response.data.userId && response.data.username) {
          this.user = { userId: response.data.userId, username: response.data.username };
          this.isLoggedIn = true;
          console.log("[AuthStore] Login successful. User state set:", JSON.parse(JSON.stringify(this.user)), "isLoggedIn:", this.isLoggedIn);
        } else {
          this.user = null;
          this.isLoggedIn = false;
          this.authError = response.data?.error || '登录响应无效或缺少用户信息。';
          console.error("[AuthStore] Login failed due to invalid response structure:", response.data);
          throw new Error(this.authError);
        }
        this.isAuthStatusResolved = true;
        return response.data; // Return data for component to handle (e.g., navigation)
      } catch (error) {
        this.user = null;
        this.isLoggedIn = false;
        // Prefer error from backend if available, else use network error or generic message
        this.authError = error.response?.data?.error || error.message || '登录过程中发生网络或服务器错误。';
        console.error("[AuthStore] Login action failed:", this.authError, error.response || error);
        this.isAuthStatusResolved = true;
        throw new Error(this.authError); // Re-throw for component to display
      }
    },

    async register(credentials) {
      console.log("[AuthStore] register action called with credentials:", credentials?.username);
      this.authError = null;
      try {
        const response = await api.register(credentials);
        console.log("[AuthStore] register API response:", JSON.parse(JSON.stringify(response.data)));
        // Registration typically doesn't log the user in automatically here,
        // it just confirms success or failure.
        return response.data;
      } catch (error) {
        this.authError = error.response?.data?.error || error.message || '注册失败。';
        console.error("[AuthStore] Registration action failed:", this.authError, error.response || error);
        throw new Error(this.authError);
      }
    },

    // This action should be called by components AFTER a successful API logout call
    processUserLogout() {
      console.log("[AuthStore] processUserLogout action called.");
      this.user = null;
      this.isLoggedIn = false;
      this.isAuthStatusResolved = true; // Auth state is now resolved to logged out
      this.authError = null;
      console.log("[AuthStore] User state cleared. isLoggedIn:", this.isLoggedIn, "User:", this.user);
    },

    async checkAuthStatus(forceCheck = false) {
      if (this.isAuthStatusResolved && !forceCheck) {
        console.log("[AuthStore] checkAuthStatus: Auth status already resolved, skipping API call unless forced. LoggedIn:", this.isLoggedIn);
        return;
      }
      console.log("[AuthStore] checkAuthStatus: Initiating API call to check status. Force check:", forceCheck);
      this.isAuthStatusResolved = false; // Indicate that we are currently checking
      this.authError = null;

      try {
        const response = await api.checkAuthStatus();
        console.log("[AuthStore] checkAuthStatus API response:", JSON.parse(JSON.stringify(response.data)));
        if (response.data && response.data.loggedIn && response.data.userId && response.data.username) {
          this.user = { userId: response.data.userId, username: response.data.username };
          this.isLoggedIn = true;
          console.log("[AuthStore] checkAuthStatus: User IS logged in. User state:", JSON.parse(JSON.stringify(this.user)));
        } else {
          this.user = null;
          this.isLoggedIn = false;
          console.log("[AuthStore] checkAuthStatus: User is NOT logged in (or invalid response).");
        }
      } catch (error) {
        this.user = null;
        this.isLoggedIn = false;
        this.authError = error.response?.data?.error || error.message || '检查登录状态时发生网络或服务器错误。';
        console.warn("[AuthStore] checkAuthStatus API call failed:", this.authError, error.response || error);
      } finally {
        this.isAuthStatusResolved = true;
        console.log("[AuthStore] checkAuthStatus completed. isAuthStatusResolved:", this.isAuthStatusResolved, "isLoggedIn:", this.isLoggedIn);
      }
    }
  },
  getters: {
    // Using getters for components to reactively access state
    currentUser: (state) => state.user,
    isAuthenticated: (state) => state.isLoggedIn,
    authReady: (state) => state.isAuthStatusResolved, // Getter for resolved status
    getAuthError: (state) => state.authError,
  }
});
