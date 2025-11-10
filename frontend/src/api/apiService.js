const API_BASE_URL = '/api';

const apiService = {
  token: null,

  setToken(token) {
    this.token = token;
  },

  async request(endpoint, options = {}) {
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

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      // 首先获取原始响应文本
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      // 检查响应内容类型
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      // 检查状态码
      if (!response.ok) {
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

  // ... 其他方法保持不变
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

  getTablesStatus() {
    return this.request('tables-status');
  }
};

export default apiService;