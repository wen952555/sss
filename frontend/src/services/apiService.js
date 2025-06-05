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

// 请求拦截器 (保持，用于发送 X-Player-Session-Id)
apiClient.interceptors.request.use(config => {
    const playerSessionId = localStorage.getItem('playerSessionId');
    if (playerSessionId) {
        config.headers['X-Player-Session-Id'] = playerSessionId;
    }
    return config;
}, error => Promise.reject(error));

// 响应拦截器 (保持，用于从后端获取和存储 player_session_id)
apiClient.interceptors.response.use(response => {
    if (response.data && response.data.player_session_id) {
        localStorage.setItem('playerSessionId', response.data.player_session_id);
    }
    return response;
}, error => Promise.reject(error));


export default {
    // 新的API方法：获取初始手牌
    getInitialDeal() {
        return apiClient.get('game.php?action=get_initial_deal'); // 使用GET请求
    },

    // 简化的提交牌型API方法
    submitPlayerHandSimple(front, mid, back, originalCards) {
        return apiClient.post('game.php?action=submit_player_hand_simple', {
            front, mid, back, original_cards: originalCards
        });
    }

    // 原有的 createGame, joinGame, getGameState 等方法可以暂时注释掉或移除
    /*
    createGame(maxPlayers = 4) { ... },
    joinGame(gameCode, playerName) { ... },
    getGameState(gameId) { ... },
    startGame(gameId) { ... },
    submitHand(gameId, front, mid, back) { ... },
    leaveGame(gameId) { ... },
    resetGameForNewRound(gameId) { ... }
    */
};
