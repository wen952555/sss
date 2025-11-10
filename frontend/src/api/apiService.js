// src/api/apiService.js

const API_BASE_URL = '/api'; // 通过Cloudflare Worker代理

const apiService = {
  token: null,

  setToken(token) {
    this.token = token;
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
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

    // 确保有body时序列化
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      // 检查HTTP状态码
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request error:', error);
      return { 
        success: false, 
        message: error.message || 'Network error or server is down.' 
      };
    }
  },

  // 用户相关
  login(phone, password) {
    return this.request('/login', {
      method: 'POST',
      body: { phone, password },
    });
  },

  register(phone, password) {
    return this.request('/register', {
      method: 'POST',
      body: { phone, password },
    });
  },

  getUser() {
    return this.request('/get-user');
  },

  // 游戏相关
  getTablesStatus() {
    return this.request('/tables-status');
  }
};

export default apiService;