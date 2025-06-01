// frontend/js/api.js
import { API_BASE_URL } from './config.js';

export async function fetchDealCards() {
    // ... (代码不变) ...
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
        return data.hand;
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
        // 先尝试解析JSON，无论成功失败
        const responseData = await response.json();

        if (!response.ok) {
            // 使用解析后的JSON中的message，或提供通用错误
            throw new Error(responseData.message || `提交牌型失败: ${response.status}`);
        }
        return responseData; // 后端应返回 { success: true/false, isValid: true/false, message: "...", score: 0, handTypeDetails: {...} }
    } catch (error) {
        console.error("API Error (fetchSubmitArrangement):", error);
        // 如果解析 response.json() 本身失败 (例如返回的不是json)，error.message 可能是 "Unexpected token < in JSON at position 0"
        // 此时，可能需要一个更通用的错误信息或记录原始响应文本
        if (error.message.includes("JSON")) {
             throw new Error("服务器响应格式错误，请检查后端API。");
        }
        throw error; // 重新抛出错误，让调用者处理
    }
}
