// frontend/src/workers/api.worker.js

const API_BASE_URL = '/api'; // Use the new single entry point

self.onmessage = async (event) => {
    const { action, payload } = event.data;
    const { game, ...body } = payload; // game is 'thirteen-cards' or 'doudizhu'

    let url;
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    };

    // Construct the URL based on game and action
    url = `${API_BASE_URL}/${game}?action=${action}`;

    // Handle GET requests
    const getActions = ['getGameState', 'getAiMove', 'getAiBid'];
    if (getActions.includes(action)) {
        options.method = 'GET';
        options.body = undefined;
        // Re-add game to the body for building query params, as it was destructured out
        const queryParams = { ...body, game: game };
        const params = new URLSearchParams(queryParams);
        url = `${API_BASE_URL}/${game}?action=${action}&${params.toString()}`;
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'API request failed');
        }
        const data = await response.json();
        self.postMessage({ success: true, action, data });
    } catch (error) {
        self.postMessage({ success: false, action, error: error.message });
    }
};
