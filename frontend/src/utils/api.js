// frontend/src/utils/api.js

const API_BASE_URL = '/api'; // Using proxy

/**
 * A helper function for making API requests.
 * @param {string} url - The URL to fetch.
 * @param {object} options - The options for the fetch request.
 * @returns {Promise<any>} - The JSON response from the API.
 */
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

export const loginUser = async (credentials) => {
    return apiFetch('/auth.php?action=login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    });
};

export const registerUser = async (userData) => {
    return apiFetch('/auth.php?action=register', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
};

export const getGame = async () => {
    return apiFetch('/game.php?action=get_game');
};

export const getArrangement = async (gameId) => {
    return apiFetch(`/game.php?action=get_arrangement&game_id=${gameId}`);
};

export const submitArrangement = async (arrangement) => {
    return apiFetch('/game.php?action=submit', {
        method: 'POST',
        body: JSON.stringify(arrangement),
    });
};
