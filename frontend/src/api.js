const PROD_API_URL = 'https://wen76674.serv00.net/api.php';
const DEV_API_BASE = '/api';

// 通用的请求函数
async function sendRequest(endpoint, action, data) {
    // 根据环境选择 URL
    // import.meta.env.DEV 是 Vite 提供的环境变量
    const url = import.meta.env.DEV
        ? `${DEV_API_BASE}/${endpoint}?action=${action}`
        : `${PROD_API_URL}?action=${action}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            let errorInfo = { error: `HTTP 错误: ${response.status}` };
            try {
                // 尝试解析可能包含在响应体中的错误信息
                errorInfo = await response.json();
            } catch (e) {
                // 如果响应体不是有效的JSON，则返回原始的文本
                const text = await response.text();
                console.error("非JSON响应:", text);
                // HTML响应意味着代理或路由问题
                if (text.trim().startsWith('<')) {
                    return { success: false, error: 'API路由配置错误，收到HTML页面' };
                }
                return { success: false, error: `服务器返回无效响应: ${text}` };
            }
            return { success: false, error: errorInfo.error || `HTTP 错误: ${response.status}` };
        }

        return await response.json();
    } catch (error) {
        console.error(`请求到 ${url} 失败:`, error);
        if (error instanceof TypeError) {
            return { success: false, error: '网络请求失败。请检查您的网络连接或服务端是否在线。' };
        }
        return { success: false, error: '网络错误，请稍后重试' };
    }
}

// 认证相关的 API
export const register = (phone, password) => sendRequest('auth', 'register', { phone, password });
export const login = (phone, password) => sendRequest('auth', 'login', { phone, password });

// 游戏相关的 API
export const fetchSegment = (userId, roomId, segment, trackId) => sendRequest('game', 'fetch_segment', { user_id: userId, room_id: roomId, segment, track_id: trackId });
export const submitHand = (userId, roomId, roundId, trackId, head, mid, tail) => sendRequest('game', 'submit', { user_id: userId, room_id: roomId, round_id: roundId, track_id: trackId, head, mid, tail });
