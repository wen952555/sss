// src/services/api.js
const API_BASE_URL = 'https://9526.ip-ddns.com/api'; // Your backend API URL

async function request(endpoint, method = 'GET', data = null, requiresAuth = false) {
    const headers = {
        'Content-Type': 'application/json',
    };
    // For calls requiring authentication, you'd send a token (JWT) or rely on session cookies.
    // If using session cookies, `credentials: 'include'` is important.
    const config = {
        method: method,
        headers: headers,
        credentials: 'include', // Send cookies for session-based auth
    };

    if (data) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        if (!response.ok) {
            // Try to parse error message from backend if available
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                // Not a JSON error response
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
            throw new Error(errorData.message || `HTTP error ${response.status}`);
        }
        if (response.status === 204) return null; // No content
        return await response.json();
    } catch (error) {
        console.error(`API request to ${endpoint} failed:`, error);
        throw error; // Re-throw to be caught by calling component
    }
}

export const authApi = {
    register: (phoneNumber, password) => request('/register.php', 'POST', { phone_number: phoneNumber, password }),
    login: (phoneNumber, password) => request('/login.php', 'POST', { phone_number: phoneNumber, password }),
    logout: () => request('/logout.php', 'POST'), // Create this endpoint if needed
    getUser: () => request('/get_user.php', 'GET', null, true), // Example authenticated endpoint
};

export const pointsApi = {
    transfer: (toPhoneNumber, amount) => request('/transfer_points.php', 'POST', { to_phone_number: toPhoneNumber, amount }, true),
};
