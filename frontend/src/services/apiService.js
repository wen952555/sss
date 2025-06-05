// frontend/src/services/apiService.js
import axios from 'axios';

const API_BASE_URL = 'https://9525.ip-ddns.com/backend/api/'; // 确保这个是正确的

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

apiClient.interceptors.request.use(config => {
    const playerSessionId = localStorage.getItem('playerSessionId');
    if (playerSessionId) {
        config.headers['X-Player-Session-Id'] = playerSessionId;
    }
    return config;
}, error => Promise.reject(error));

apiClient.interceptors.response.use(response => {
    if (response.data && response.data.player_session_id) {
        localStorage.setItem('playerSessionId', response.data.player_session_id);
    }
    return response;
}, error => Promise.reject(error));

export default {
    getInitialDeal() {
        return apiClient.get('game.php?action=get_initial_deal');
    },
    // 其他API方法暂时不需要
};
