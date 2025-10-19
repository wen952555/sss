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

// --- Game Actions (now handled by WebSocket) --- //
// export const joinRoom = ...
// export const setReady = ...
// export const startGame = ...
// export const submitHand = ...
// export const getRoomState = ...

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
