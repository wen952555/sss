// API 通信模块
import { API_BASE_URL } from './config.js';

/**
 * 向后端请求发牌
 * @returns {Promise<Array<object>>} - 卡牌数据数组
 */
export async function fetchDealCards() {
    try {
        const response = await fetch(`${API_BASE_URL}/deal_cards.php`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "未知错误" }));
            throw new Error(`发牌失败: ${response.status} ${errorData.message || ''}`);
        }
        const data = await response.json();
        return data.hand; // 后端应返回 { hand: [...] } 格式
    } catch (error) {
        console.error("API Error (fetchDealCards):", error);
        throw error; //  重新抛出错误，让调用者处理
    }
}

/**
 * 示例：向后端请求理牌 (假设有这个接口)
 * @param {Array<object>} currentHand - 当前手牌
 * @returns {Promise<Array<object>>} - 理好的牌
 */
export async function fetchSortHand(currentHand) {
    try {
        const response = await fetch(`${API_BASE_URL}/sort_hand.php`, { // 假设的接口
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ hand: currentHand }),
        });
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ message: "未知错误" }));
            throw new Error(`理牌失败: ${response.status} ${errorData.message || ''}`);
        }
        const data = await response.json();
        return data.sortedHand;
    } catch (error) {
        console.error("API Error (fetchSortHand):", error);
        throw error;
    }
}
