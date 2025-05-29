import { defineStore } from 'pinia';
import api from '../services/api';
// import router from '../router'; // Usually router is not needed inside store, handle navigation in components or router guards

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // Should be object { userId, username } or null
    isLoggedIn: false,
    isAuthStatusResolved: false, // To track if initial checkAuthStatus is done
    authError: null, // Store auth related errors
  }),
  actions: {
    async login(credentials) {
      console.log("[AuthStore] login action called with:", credentials);
      this.authError = null;
      try {
        const response = await api.login(credentials);
        console.log("[AuthStore] login API response:", response);
        if (response.data && response.data.userId && response.data.username) {
          this.user = { userId: response.data.userId, username: response.data.username };
          this.isLoggedIn = true;
          console.log("[AuthStore] Login successful. User set to:", JSON.parse(JSON.stringify(this.user)));
        } else {
          // This case should ideally be an error from API, but handle unexpected success structure
          this.user = null;
          this.isLoggedIn = false;
          this.authError = '登录响应格式不正确。';
          console.error("[AuthStore] Login response missing userId or username:", response.data);
          throw new Error(this.authError);
        }
        return response.data;
      } catch (error) {
        this.user = null;
        this.isLoggedIn = false;
        this.authError = error.response?.data?.error || error.message || '登录失败。';
        console.error("[AuthStore] Login failed:", this.authError, error.response || error);
        throw new Error(this.authError); // Re-throw for component to catch
      } finally {
        this.isAuthStatusResolved = true; // Mark auth as resolved after login attempt
      }
    },

    async register(credentials) {
      // ... (register logic, ensure it doesn't set loggedIn state, just returns success/error)
      console.log("[AuthStore] register action called");
      this.authError = null;
      try {
        const response = await api.register(credentials);
        console.log("[AuthStore] register API response:", response);
        return response.data; // Typically just a success message
      } catch (error) {
        this.authError = error.response?.data?.error || error.message || '注册失败。';
        console.error("[AuthStore] Registration failed:", this.authError, error.response || error);
        throw new Error(this.authError);
      }
    },

    logoutAction() { // Renamed to avoid conflict with potential 'logout' getter/state
      console.log("[AuthStore] logoutAction called");
      this.authError = null;
      // No need to call api.logout() here if it's handled in App.vue or component
      // This action is primarily for clearing client-side state.
      this.user = null;
      this.isLoggedIn = false;
      this.isAuthStatusResolved = true; // Auth state is known (logged out)
      console.log("[AuthStore] User logged out from store. isLoggedIn:", this.isLoggedIn, "User:", this.user);
    },

    async checkAuthStatus() {
      console.log("[AuthStore] checkAuthStatus called. Current resolved status:", this.isAuthStatusResolved);
      // Avoid re-checking if already resolved, unless forced
      // if (this.isAuthStatusResolved && from !== 'force') return;

      this.authError = null;
      try {
        console.log("[AuthStore] checkAuthStatus: Calling api.checkAuthStatus...");
        const response = await api.checkAuthStatus();
        console.log("[AuthStore] checkAuthStatus API response:", response);
        if (response.data && response.data.loggedIn && response.data.userId && response.data.username) {
          this.user = { userId: response.data.userId, username: response.data.username };
          this.isLoggedIn = true;
          console.log("[AuthStore] checkAuthStatus: User is logged in. User set to:", JSON.parse(JSON.stringify(this.user)));
        } else {
          this.user = null;
          this.isLoggedIn = false;
          console.log("[AuthStore] checkAuthStatus: User is NOT logged in or response invalid. isLoggedIn:", this.isLoggedIn);
        }
      } catch (error) {
        this.user = null;
        this.isLoggedIn = false;
        this.authError = error.response?.data?.error || error.message || '检查登录状态失败。';
        console.warn("[AuthStore] checkAuthStatus API call failed:", this.authError, error.response || error);
      } finally {
        this.isAuthStatusResolved = true;
        console.log("[AuthStore] checkAuthStatus completed. isAuthStatusResolved:", this.isAuthStatusResolved);
      }
    },
    // Action to be called after successful logout API call by component
    processLogout() {
        console.log("[AuthStore] processLogout called by component after API logout.");
        this.user = null;
        this.isLoggedIn = false;
        this.isAuthStatusResolved = true;
    }
  },
  getters: {
    currentUser: (state) => state.user,
    isAuthenticated: (state) => state.isLoggedIn,
    isAuthReady: (state) => state.isAuthStatusResolved,
  }
});
