// frontend/src/services/apiService.js
import axios from 'axios';

const API_BASE_URL = 'https://9525.ip-ddns.com/backend/api/';

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
}, error => {
    return Promise.reject(error);
});

apiClient.interceptors.response.use(response => {
    if (response.data && response.data.player_session_id) {
        // console.log("API Service: Received player_session_id from backend:", response.data.player_session_id);
        localStorage.setItem('playerSessionId', response.data.player_session_id);
    }
    return response;
}, error => {
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
        return apiClient.post('game.php?action=submit_hand', {
            game_id: gameId,
            front: front.map(c => c.toArray ? c.toArray() : c),
            mid: mid.map(c => c.toArray ? c.toArray() : c),
            back: back.map(c => c.toArray ? c.toArray() : c)
        });
    },
    resetGameForNewRound(gameId) {
        return apiClient.post('game.php?action=reset_game_for_new_round', { game_id: gameId });
    },
    // 新增：离开游戏API调用
    leaveGame(gameId) {
        return apiClient.post('game.php?action=leave_game', { game_id: gameId });
    }
};
