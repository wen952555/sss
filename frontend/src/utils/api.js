const request = async (endpoint, options = {}) => {
    const { body, ...restOptions } = options;
    const headers = {
        'Content-Type': 'application/json',
        ...restOptions.headers,
    };

    try {
        const response = await fetch(`/api${endpoint}`, {
            ...restOptions,
            headers,
            body: JSON.stringify(body),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'An error occurred.');
        }
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
};

export const login = (credentials) => request('/login', { method: 'POST', body: credentials });
export const register = (userData) => request('/register', { method: 'POST', body: userData });
export const forgotPassword = (email) => request('/forgot-password', { method: 'POST', body: { email } });
export const resetPassword = (data) => request('/reset-password', { method: 'POST', body: data });