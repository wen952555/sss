// frontend/src/workers/api.worker.js

const API_BASE_URL = '/api';

self.onmessage = async (event) => {
    const { action, payload } = event.data;
    const { resource, ...body } = payload;

    if (!resource) {
        self.postMessage({ success: false, action, error: "No resource specified for API call." });
        return;
    }

    let url;
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    };

    // Default POST URL
    url = `${API_BASE_URL}/${resource}?action=${action}`;

    // Handle GET requests
    const getActions = ['getGameState', 'getAiMove', 'getAiBid', 'getPoints', 'checkAuth', 'logout'];
    if (getActions.includes(action)) {
        options.method = 'GET';
        options.body = undefined;
        const params = new URLSearchParams(body);
        url = `${API_BASE_URL}/${resource}?action=${action}&${params.toString()}`;
    }

    try {
        const response = await fetch(url, options);
        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.message || 'API request failed');
        }
        self.postMessage({ success: true, action, data: responseData });
    } catch (error) {
        self.postMessage({ success: false, action, error: error.message });
    }
};
