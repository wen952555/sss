// frontend/src/utils/api.js

const API_BASE_URL = '/api'; // Using proxy

const apiFetch = async (url, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

export const loginUser = (credentials) => apiFetch('/auth.php?action=login', {
    method: 'POST',
    body: JSON.stringify(credentials),
});

export const registerUser = (userData) => apiFetch('/auth.php?action=register', {
    method: 'POST',
    body: JSON.stringify(userData),
});

export const getGame = () => apiFetch('/game.php?action=get_game');

export const getArrangement = (gameId) => apiFetch(`/game.php?action=get_arrangement&game_id=${gameId}`);

export const submitArrangement = (data) => apiFetch('/game.php?action=submit', {
    method: 'POST',
    body: JSON.stringify(data),
});

export const getResults = (gameId) => apiFetch(`/game.php?action=get_results&game_id=${gameId}`);
