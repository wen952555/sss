// src/api/apiService.js

// 使用 Worker 代理
const API_BASE_URL = '/api';

const apiService = {
  token: null,

  setToken(token) {
    this.token = token;
  },

  async request(endpoint, options = {}) {
    // 确保endpoint不以/开头（因为API_BASE_URL已经有/）
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${API_BASE_URL}/${normalizedEndpoint}`;
    
    console.log(`Making API request to: ${url}`);

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
        message: error.message || '网络错误，请检查网络连接' 
      };
    }
  },

  // 用户相关 - 使用简单的端点名称，Worker会转换为正确的后端URL
  login(phone, password) {
    return this.request('login', {
      method: 'POST',
      body: { phone, password },
    });
  },

  register(phone, password) {
    return this.request('register', {
      method: 'POST',
      body: { phone, password },
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