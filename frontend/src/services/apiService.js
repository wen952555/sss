import axios from 'axios';

// 后端API基础URL (根据你的Serv00部署路径修改)
const API_BASE_URL = 'https://9525.ip-ddns.com/backend/api/'; // 注意最后的斜杠

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // 确保跨域时携带cookie (如果PHP session依赖cookie)
});

// 请求拦截器，用于携带 player_session_id
apiClient.interceptors.request.use(config => {
    const playerSessionId = localStorage.getItem('playerSessionId');
    if (playerSessionId) {
        config.headers['X-Player-Session-Id'] = playerSessionId;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// 响应拦截器，用于处理后端返回的 player_session_id
apiClient.interceptors.response.use(response => {
    if (response.data && response.data.player_session_id) {
        localStorage.setItem('playerSessionId', response.data.player_session_id);
    }
    return response;
}, error => {
    // 可以在这里处理全局错误，例如401未授权跳转登录等
    return Promise.reject(error);
});


export default {
    createGame(maxPlayers = 4) {
        return apiClient.post('game.php?action=create_game', { max_players: maxPlayers });
    },
    joinGame(gameCode, playerName) {
        return apiClient.post('game.php?action=join_game', { game_code: gameCode, player_name: playerName });
    },
    startGame(gameId) {
        return apiClient.post('game.php?action=start_game', { game_id: gameId });
    },
    getGameState(gameId) {
        return apiClient.get(`game.php?action=get_game_state&game_id=${gameId}`);
    },
    submitHand(gameId, front, mid, back) {
        // 确保提交的是卡牌对象数组
        return apiClient.post('game.php?action=submit_hand', {
            game_id: gameId,
            front: front.map(c => c.toArray ? c.toArray() : c), // 如果是Card对象实例
            mid: mid.map(c => c.toArray ? c.toArray() : c),
            back: back.map(c => c.toArray ? c.toArray() : c)
        });
    },
    resetGameForNewRound(gameId) {
        return apiClient.post('game.php?action=reset_game_for_new_round', { game_id: gameId });
    }
};
