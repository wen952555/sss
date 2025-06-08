// frontend/src/services/api.js
import axios from 'axios';

// 后端API的基础URL
// ***** 修改这里，添加 /backend 路段 *****
const API_BASE_URL = 'https://9526.ip-ddns.com/backend/api/v1/test_cors_header.php'; // 您的后端域名和正确路径

// 创建一个Axios实例，可以配置默认值
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 允许跨域请求携带凭证 (Session Cookie)
});

// --- 辅助函数处理响应 ---
const handleResponse = (response) => {
  return response.data;
};

const handleError = (error) => {
  console.error('API Error Details:', error); // 打印更详细的错误信息
  if (error.response) {
    // 请求已发出，服务器用状态码响应 (非2xx)
    console.error('Response Data:', error.response.data);
    console.error('Response Status:', error.response.status);
    console.error('Response Headers:', error.response.headers);
    // 如果后端返回了特定的错误信息
    if (error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    } else {
      // 使用HTTP状态文本作为错误消息
      throw new Error(error.response.statusText || `请求失败，状态码：${error.response.status}`);
    }
  } else if (error.request) {
    // 请求已发出，但没有收到响应 (例如网络问题，或CORS预检失败后实际请求未发出)
    console.error('Request Data:', error.request);
    // 对于 "No 'Access-Control-Allow-Origin' header" 这类错误，error.message通常是 "Network Error"
    // 并且 error.response 会是 undefined
    throw new Error(error.message || '网络错误，无法连接到服务器。请检查CORS策略或网络连接。');
  } else {
    // 设置请求时发生了一些事情，触发了错误
    console.error('Error Message:', error.message);
    throw new Error(error.message || '发生未知请求错误');
  }
};

// --- Auth Service ---
// URL现在是相对于 API_BASE_URL (即 /backend/api/v1) 的
export const authService = {
  register: (phone, password) =>
    apiClient.post(`/auth.php?action=register`, { phone, password }).then(handleResponse).catch(handleError),
  login: (phone, password) =>
    apiClient.post(`/auth.php?action=login`, { phone, password }).then(handleResponse).catch(handleError),
  logout: () =>
    apiClient.post(`/auth.php?action=logout`).then(handleResponse).catch(handleError),
  getProfile: () =>
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
  createGame: (maxPlayers = 1) =>
    apiClient.post(`/game.php?action=create_game`, {}).then(handleResponse).catch(handleError),
  joinGame: (gameId) =>
    apiClient.post(`/game.php?action=join_game`, { game_id: gameId }).then(handleResponse).catch(handleError),
  dealCards: (gameId) =>
    apiClient.post(`/game.php?action=deal_cards`, { game_id: gameId }).then(handleResponse).catch(handleError),
  getGameState: (gameId) =>
    apiClient.get(`/game.php?action=get_game_state`, { params: { game_id: gameId } }).then(handleResponse).catch(handleError),
  requestAIArrangement: (gameId) =>
    apiClient.post(`/game.php?action=request_ai_arrangement`, { game_id: gameId }).then(handleResponse).catch(handleError),
  submitArrangement: (arrangement, gameId) =>
    apiClient.post(`/game.php?action=submit_arrangement`, { ...arrangement, game_id: gameId })
      .then(handleResponse).catch(handleError),
};

export default apiClient;
