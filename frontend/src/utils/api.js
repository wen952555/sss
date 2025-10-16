const API_BASE_URL = '/api';

async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const { body, headers = {}, ...customConfig } = options;

    const config = {
        method: body ? 'POST' : 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        ...customConfig,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message);
        }
        return await response.json();
    } catch (error) {
        console.error('API 调用失败:', error);
        throw error; // Re-throw the error to be handled by the calling component
    }
}

// --- Auth --- //
export const login = (data) => {
    const { phone, password } = data;
    return request('/login', { body: { phone, password } });
};

export const register = (data) => {
    const { phone, password } = data;
    return request('/register', { body: { phone, password } });
};

// --- Rooms --- //
export const getRooms = (token) => {
    return request('/rooms', { headers: { 'Authorization': `Bearer ${token}` } });
};

export const createRoom = (token) => {
    return request('/rooms', { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

export const getRoomState = (roomId, token) => {
    return request(`/rooms/${roomId}`, { headers: { 'Authorization': `Bearer ${token}` } });
};

// --- Game Actions --- //
export const joinRoom = (roomId, token) => {
    return request(`/rooms/${roomId}/join`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` } 
    });
};

export const setReady = (roomId, isReady, token) => {
    return request(`/rooms/${roomId}/ready`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` },
        body: { isReady }
    });
};

export const startGame = (roomId, token) => {
    return request(`/rooms/${roomId}/start`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` } 
    });
};

export const submitHand = (roomId, hand, token) => {
    return request(`/rooms/${roomId}/submit`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` },
        body: { hand }
    });
};

// --- Gifting --- //
export const findUserByPhone = (phone, token) => {
    return request('/user/find', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: { phone },
    });
};

export const sendPoints = (recipientId, amount, token) => {
    return request('/points/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: { recipientId, amount },
    });
};
