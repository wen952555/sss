// frontend/js/apiService.js
import { BACKEND_API_URL } from './constants.js';
import { processRawHandData } from './cardUtils.js';

export async function fetchNewHandFromServer() {
    try {
        const response = await fetch(`${BACKEND_API_URL}?action=deal`);
        if (!response.ok) {
            throw new Error(`后端发牌API错误: ${response.status} ${await response.text()}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(`后端错误: ${data.error}`);
        }
        return processRawHandData(data.hand); // 处理原始数据
    } catch (error) {
        console.error('获取手牌失败:', error);
        throw error; // 重新抛出，让调用者处理UI
    }
}

export async function submitHandToServer(arrangedHandData) {
    // arrangedHandData = { front: [cardId1, cardId2,...], middle: [], back: [] }
    const payload = {
        action: 'submit_hand',
        front: arrangedHandData.front,
        middle: arrangedHandData.middle,
        back: arrangedHandData.back,
    };

    try {
        const response = await fetch(BACKEND_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error(`服务器验证API错误: ${response.status} ${await response.text()}`);
        }
        const result = await response.json();
        if (result.error && !result.isValid) { // 后端可能返回error同时包含isValid:false
             // throw new Error(`后端验证错误: ${result.error}`);
        }
        return result; // { isValid, message, score, frontHandType, middleHandType, backHandType }
    } catch (error) {
        console.error('提交牌型至服务器失败:', error);
        throw error;
    }
}
