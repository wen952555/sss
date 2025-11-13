
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
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`服务器返回了非JSON响应: ${text.substring(0, 100)}`);
    }
    
    if (!response.ok) {
      throw new Error(data.message || '请求失败');
    }
    
    return data;
  } catch (error) {
    console.error('API请求错误:', error);
    
    if (error.message.includes('Failed to fetch')) {
      throw new Error('网络连接失败，请检查网络连接');
    } else if (error.message.includes('非JSON响应')) {
      throw new Error('服务器响应异常，请稍后重试');
    } else {
      throw error;
    }
  }
};

// 将卡片文件名解析为对象
const parseCardFromFilename = (card) => {
  if (typeof card !== 'string' || !card.includes('_of_')) {
    return { display: card, filename: card };
  }
  
  const filename = card.endsWith('.svg') ? card : `${card}.svg`;
  const [value, suit] = filename.replace('.svg', '').split('_of_');
  
  const suitSymbols = {
    'clubs': '♣',
    'diamonds': '♦', 
    'hearts': '♥',
    'spades': '♠'
  };
  
  const valueMap = {
    'ace': 'A', 'king': 'K', 'queen': 'Q', 'jack': 'J',
    '10': '10', '9': '9', '8': '8', '7': '7', '6': '6',
    '5': '5', '4': '4', '3': '3', '2': '2'
  };
  
  return {
    display: `${valueMap[value] || value}${suitSymbols[suit] || suit}`,
    filename: filename
  };
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
  getGame: async (sessionType) => {
    const result = await request(`/game.php?action=get_game&session_type=${sessionType}`);
    
    // 确保卡片数据格式正确
    if (result.success && result.preset_arrangement) {
      const formatCards = (cards) => {
        if (!cards || !Array.isArray(cards)) return [];
        
        return cards.map(card => {
          if (card && typeof card === 'object' && card.filename) {
            return card; // 已经是正确的对象格式
          }
          if (typeof card === 'string') {
            return parseCardFromFilename(card); // 从字符串转换
          }
          return card; // 其他情况，直接返回
        });
      };
      
      // 处理预设牌型
      result.preset_arrangement.head = formatCards(result.preset_arrangement.head);
      result.preset_arrangement.middle = formatCards(result.preset_arrangement.middle);
      result.preset_arrangement.tail = formatCards(result.preset_arrangement.tail);
      
      // 处理原始手牌
      if (result.original_cards) {
        result.original_cards = formatCards(result.original_cards);
      }
    }
    
    return result;
  },
  
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
