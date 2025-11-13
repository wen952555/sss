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
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '请求失败');
    }
    
    return data;
  } catch (error) {
    console.error('API请求错误:', error);
    throw error;
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