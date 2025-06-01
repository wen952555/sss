// frontend/js/api.js
import { API_BASE_URL } from './config.js';

export async function fetchDealCards() {
    try {
        const response = await fetch(`${API_BASE_URL}/deal_cards.php`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "未知错误" }));
            throw new Error(`发牌失败: ${response.status} ${errorData.message || ''}`);
        }
        const data = await response.json();
        if (!data.success || !data.hand) {
            throw new Error(data.message || "获取手牌数据格式错误");
        }
        return data.hand; // Expected: array of {rank, suit}
    } catch (error) {
        console.error("API Error (fetchDealCards):", error);
        throw error;
    }
}

export async function fetchSubmitArrangement(pilesData) {
    try {
        const response = await fetch(`${API_BASE_URL}/submit_arrangement.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pilesData),
        });
        const responseData = await response.json(); // Attempt to parse JSON regardless of status
        if (!response.ok) {
            throw new Error(responseData.message || `提交牌型失败: ${response.status}`);
        }
        return responseData;
    } catch (error) {
        console.error("API Error (fetchSubmitArrangement):", error);
        if (error.message && error.message.toLowerCase().includes("json")) {
             throw new Error("服务器响应格式错误 (提交牌型)。");
        }
        throw error;
    }
}

export async function fetchAISuggestion(currentHand, previousHashes = []) {
    try {
        const response = await fetch(`${API_BASE_URL}/get_ai_arrangement.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ hand: currentHand, previousHashes: previousHashes }),
        });
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || `获取AI建议失败: ${response.status}`);
        }
        // No need to check responseData.success here if the API guarantees a certain structure
        // The caller (main.js) will check for responseData.arrangement being null or not.
        return responseData;
    } catch (error) {
        console.error("API Error (fetchAISuggestion):", error);
        if (error.message && error.message.toLowerCase().includes("json")) {
             throw new Error("AI服务器响应格式错误。");
        }
        throw error;
    }
}
