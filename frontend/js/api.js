// frontend/js/api.js

/**
 * 封装fetch请求
 * @param {string} url API端点完整URL
 * @param {object} options fetch的options对象 (method, headers, body等)
 * @returns {Promise<object>} 解析后的JSON数据
 * @throws {Error} 如果请求失败或响应不为JSON
 */
async function fetchData(url, options = {}) {
    // 自动添加认证凭证 (如果使用session cookie)
    options.credentials = options.credentials || 'include';

    // 默认头部 (如果需要，比如Content-Type for POST)
    options.headers = {
        'Content-Type': 'application/json', // 默认发送JSON
        ...options.headers,
    };
    if (options.body && typeof options.body !== 'string') {
        options.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            // 尝试解析错误JSON体
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                // 如果错误响应不是JSON
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
            const errorMessage = errorData?.error?.message || `HTTP error ${response.status}`;
            const errorDetails = errorData?.error?.details;
            const err = new Error(errorMessage);
            err.status = response.status;
            err.details = errorDetails;
            throw err;
        }
        // 如果响应状态码是 204 No Content，则不尝试解析JSON
        if (response.status === 204) {
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error; // 重新抛出，让调用者处理
    }
}

// --- 认证 API ---
const authAPI = {
    register: (data) => fetchData(`${API_ENDPOINTS.auth}?action=register`, { method: 'POST', body: data }),
    login: (data) => fetchData(`${API_ENDPOINTS.auth}?action=login`, { method: 'POST', body: data }),
    logout: () => fetchData(`${API_ENDPOINTS.auth}?action=logout`, { method: 'POST' }), // 或者GET
    checkStatus: () => fetchData(`${API_ENDPOINTS.auth}?action=check_status`),
};

// --- 用户资料 API ---
const userProfileAPI = {
    getMyProfile: () => fetchData(`${API_ENDPOINTS.userProfile}?action=get_my_profile`),
    updateNickname: (data) => fetchData(`${API_ENDPOINTS.userProfile}?action=update_nickname`, { method: 'POST', body: data }),
    // ... (find_user_by_phone, gift_points, get_point_transactions)
    findUserByPhone: (phone) => fetchData(`${API_ENDPOINTS.userProfile}?action=find_user_by_phone&phone=${encodeURIComponent(phone)}`),
    giftPoints: (data) => fetchData(`${API_ENDPOINTS.userProfile}?action=gift_points`, { method: 'POST', body: data }),
    getPointTransactions: (page = 1, limit = 20) => fetchData(`${API_ENDPOINTS.userProfile}?action=get_point_transactions&page=${page}&limit=${limit}`),
};

// --- 房间 API ---
const roomsAPI = {
    createRoom: (data) => fetchData(`${API_ENDPOINTS.rooms}?action=create_room`, { method: 'POST', body: data }),
    listRooms: () => fetchData(`${API_ENDPOINTS.rooms}?action=list_rooms`),
    getRoomDetails: (roomId) => fetchData(`${API_ENDPOINTS.rooms}?action=get_room_details&room_id=${roomId}`),
    joinRoom: (data) => fetchData(`${API_ENDPOINTS.rooms}?action=join_room`, { method: 'POST', body: data }),
    leaveRoom: (data) => fetchData(`${API_ENDPOINTS.rooms}?action=leave_room`, { method: 'POST', body: data }),
    playerReady: (data) => fetchData(`${API_ENDPOINTS.rooms}?action=player_ready`, { method: 'POST', body: data }),
    startGame: (data) => fetchData(`${API_ENDPOINTS.rooms}?action=start_game`, { method: 'POST', body: data }),
};

// --- 游戏 API ---
const gameAPI = {
    getGameState: (gameId) => fetchData(`${API_ENDPOINTS.game}?action=get_game_state&game_id=${gameId}`),
    submitArrangement: (data) => fetchData(`${API_ENDPOINTS.game}?action=submit_arrangement`, { method: 'POST', body: data }),
    aiArrangeMyCards: (data) => fetchData(`${API_ENDPOINTS.game}?action=ai_arrange_my_cards`, { method: 'POST', body: data }),
    // setAi托管 (如果实现)
};
