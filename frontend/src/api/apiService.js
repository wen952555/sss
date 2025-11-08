// src/api/apiService.js

const API_BASE_URL = '/api'; // 通过Cloudflare Worker代理

const apiService = {
  token: null,

  setToken(token) {
    this.token = token;
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}/${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      return response.json();
    } catch (error) {
      console.error('API request error:', error);
      return { success: false, message: 'Network error or server is down.' };
    }
  },

  // 用户相关
  login(phone, password) {
    return this.request('login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  },

  register(phone, password) {
    return this.request('register', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  },
  
  getUser() {
    return this.request('get-user');
  },

  // 游戏相关
  getTablesStatus() {
      return this.request('tables-status');
  }
};

export default apiService;