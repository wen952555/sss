import { defineStore } from 'pinia';
import api from '../services/api';
import router from '../router';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // Will hold { userId, username }
    isLoggedIn: false,
    isAuthStatusResolved: false, // To track if initial checkAuthStatus is done
  }),
  actions: {
    async login(credentials) {
      try {
        const response = await api.login(credentials);
        this.user = { userId: response.data.userId, username: response.data.username };
        this.isLoggedIn = true;
        this.isAuthStatusResolved = true;
        // localStorage.setItem('authToken', response.data.token); // If using JWT
        return response.data;
      } catch (error) {
        this.isAuthStatusResolved = true;
        console.error("Login failed:", error.response?.data || error.message);
        throw error.response?.data || new Error("Login failed");
      }
    },
    async register(credentials) {
      try {
        const response = await api.register(credentials);
        // Optionally auto-login after register or redirect to login
        return response.data;
      } catch (error) {
        console.error("Registration failed:", error.response?.data || error.message);
        throw error.response?.data || new Error("Registration failed");
      }
    },
    logout() {
      this.user = null;
      this.isLoggedIn = false;
      // localStorage.removeItem('authToken'); // If using JWT
      // api.logout(); // Call API to clear server session (already handled in App.vue example)
      console.log("User logged out from store");
    },
    async checkAuthStatus() {
      if (this.isAuthStatusResolved && this.isLoggedIn) return; // No need to re-check if already logged in and resolved

      try {
        const response = await api.checkAuthStatus();
        if (response.data.loggedIn) {
          this.user = { userId: response.data.userId, username: response.data.username };
          this.isLoggedIn = true;
        } else {
          this.user = null;
          this.isLoggedIn = false;
        }
      } catch (error) {
        console.warn("Auth status check failed or not logged in:", error.response?.data || error.message);
        this.user = null;
        this.isLoggedIn = false;
      } finally {
        this.isAuthStatusResolved = true;
      }
    },
  },
});
