// frontend/src/services/api.js
import axios from 'axios';

// 后端API的基础URL
// 对于Cloudflare Pages部署，如果前端和后端域名不同，需要配置CORS
const API_BASE_URL = 'https://9526.ip-ddns.com/api/v1'; // 您的后端域名

// 创建一个Axios实例，可以配置默认值
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 允许跨域请求携带凭证 (例如 Session Cookie)
  // 这需要后端配置 Access-Control-Allow-Credentials: true
  // 以及 Access-Control-Allow-Origin 为您的前端域名
  withCredentials: true,
});

// --- 辅助函数处理响应 ---
const handleResponse = (response) => {
  // console.log('API Response:', response);
  return response.data; // 通常我们只需要data部分
};

const handleError = (error) => {
  console.error('API Error:', error.response || error.message || error);
  if (error.response && error.response.data && error.response.data.message) {
    // 如果后端返回了特定的错误信息
    throw new Error(error.response.data.message);
  } else if (error.message) {
    throw new Error(error.message);
  } else {
    throw new Error('发生未知网络错误');
  }
};

// --- Auth Service ---
export const authService = {
  register: (phone, password) =>
    apiClient.post(`/auth.php?action=register`, { phone, password }).then(handleResponse).catch(handleError),
  login: (phone, password) =>
    apiClient.post(`/auth.php?action=login`, { phone, password }).then(handleResponse).catch(handleError),
  logout: () =>
    apiClient.post(`/auth.php?action=logout`).then(handleResponse).catch(handleError),
  getProfile: () => // 获取当前登录用户信息
    apiClient.get(`/auth.php?action=profile`).then(handleResponse).catch(handleError),
};

// --- User Service ---
export const userService = {
  giftPoints: (receiverPhone, amount) =>
    apiClient.post(`/user.php?action=gift_points`, { receiver_phone: receiverPhone, amount })
      .then(handleResponse).catch(handleError),
  getMyPoints: () =>
    apiClient.get(`/user.php?action=get_my_points`).then(handleResponse).catch(handleError),
};

// --- Game Service ---
export const gameService = {
  createGame: (maxPlayers = 1) => // 简化为单人游戏，所以不传maxPlayers
    apiClient.post(`/game.php?action=create_game`, {}).then(handleResponse).catch(handleError),
  joinGame: (gameId) => // 如果需要加入特定游戏
    apiClient.post(`/game.php?action=join_game`, { game_id: gameId }).then(handleResponse).catch(handleError),
  dealCards: (gameId) => // gameId 可选，后端会用session中的
    apiClient.post(`/game.php?action=deal_cards`, { game_id: gameId }).then(handleResponse).catch(handleError),
  getGameState: (gameId) => // gameId 可选
    apiClient.get(`/game.php?action=get_game_state`, { params: { game_id: gameId } }).then(handleResponse).catch(handleError),
  requestAIArrangement: (gameId) => // gameId 可选，AI理牌的是当前用户的手牌
    apiClient.post(`/game.php?action=request_ai_arrangement`, { game_id: gameId }).then(handleResponse).catch(handleError),
  submitArrangement: (arrangement, gameId) => // arrangement: { front: [], middle: [], back: [] }
    apiClient.post(`/game.php?action=submit_arrangement`, { ...arrangement, game_id: gameId })
      .then(handleResponse).catch(handleError),
};

export default apiClient; // 也可以导出默认实例供其他地方直接使用
