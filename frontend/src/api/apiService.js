// src/api/apiService.js

const API_BASE_URL = '/api';

const apiService = {
  token: null,

  setToken(token) {
    this.token = token;
    console.log('Token set:', token ? 'Yes' : 'No');
  },

  async request(endpoint, options = {}) {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${API_BASE_URL}/${normalizedEndpoint}`;
    
    console.log(`Making API request to: ${url}`, { hasToken: !!this.token });

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

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      // 首先获取原始响应文本
      const responseText = await response.text();
      console.log('Raw response:', responseText.substring(0, 200));
      
      // 检查状态码
      if (!response.ok) {
        // 如果是401错误，可能是token问题
        if (response.status === 401) {
          console.warn('Authentication failed, token might be invalid');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // 尝试解析JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }
      
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
  },

  // 加入桌子（待实现）
  joinTable(tableId) {
    return this.request('join-table', {
      method: 'POST',
      body: { table_id: tableId },
    });
  },

  // 获取游戏状态
  getGameState(tableId) {
    return this.request(`game-state?table_id=${tableId}`);
  },

  // 提交手牌
  submitHand(tableId, hand) {
    return this.request('submit-hand', {
      method: 'POST',
      body: { table_id: tableId, hand },
    });
  },

  // 退出游戏
  exitGame(tableId) {
    return this.request('exit-game', {
      method: 'POST',
      body: { table_id: tableId },
    });
  }
};

export default apiService;