// src/utils/api.js
const API_BASE_URL_PHP = 'https://9525.ip-ddns.com/api'; // Your PHP backend base URL

export const fetchInitialCards = async () => {
    const response = await fetch(`${API_BASE_URL_PHP}/deal_cards.php`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
};

export const evaluateArrangement = async (frontHand, middleHand, backHand) => {
    const payload = {
        frontHand,
        middleHand,
        backHand
    };
    const response = await fetch(`${API_BASE_URL_PHP}/evaluate_hands.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorData = await response.text(); // Or response.json() if server sends JSON error
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
    }
    return response.json();
};
