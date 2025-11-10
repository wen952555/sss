const API_BASE_URL = '/api'; // 通过Cloudflare Worker代理

const apiService = {
  token: null,

  setToken(token) {
    this.token = token;
  },

  async request(endpoint, options = {}) {
    // 确保endpoint以/开头
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE_URL}${normalizedEndpoint}`;
    
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
        // 如果是502错误，说明Worker无法连接到后端
        if (response.status === 502) {
          throw new Error('服务器暂时不可用，请稍后重试');
        }
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