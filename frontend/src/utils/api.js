const API_BASE = '/api';

// 通用请求函数
const request = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // 添加认证token
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    
    // 检查响应内容类型
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // 如果不是JSON，获取原始文本
      const text = await response.text();
      throw new Error(`服务器返回了非JSON响应: ${text.substring(0, 100)}`);
    }
    
    if (!response.ok) {
      throw new Error(data.message || '请求失败');
    }
    
    return data;
  } catch (error) {
    console.error('API请求错误:', error);
    
    // 提供更友好的错误信息
    if (error.message.includes('Failed to fetch')) {
      throw new Error('网络连接失败，请检查网络连接');
    } else if (error.message.includes('非JSON响应')) {
      throw new Error('服务器响应异常，请稍后重试');
    } else {
      throw error;
    }
  }
};

// 用户API
export const authAPI = {
  login: (phone, password) => 
    request('/auth.php?action=login', {
      method: 'POST',
      body: { phone, password }
    }),
  
  register: (phone, password, email) =>
    request('/auth.php?action=register', {
      method: 'POST',
      body: { phone, password, email }
    }),

  findUserId: (phone) =>
    request('/auth.php?action=find_user_id', {
      method: 'POST',
      body: { phone }
    }),
};

// 游戏API
export const gameAPI = {
  getGame: (sessionType) =>
    request(`/game.php?action=get_game&session_type=${sessionType}`),
  
  submitCards: (gameId, arrangedCards) =>
    request('/game.php?action=submit', {
      method: 'POST',
      body: { game_id: gameId, arranged_cards: arrangedCards }
    }),

  getUserInfo: () =>
    request('/game.php?action=user_info'),
};

// 余额API
export const balanceAPI = {
  transfer: (toUserId, amount, note = '') =>
    request('/balance.php?action=transfer', {
      method: 'POST',
      body: { to_user_id: toUserId, amount, note }
    }),

  getTransfers: (limit = 20) =>
    request(`/balance.php?action=transfers&limit=${limit}`),

  getRecentTransfers: (count = 5) =>
    request(`/balance.php?action=recent_transfers&count=${count}`),
};