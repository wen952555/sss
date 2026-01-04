const PROD_API_BASE = 'https://wen76674.serv00.net/api';
const DEV_API_BASE = '/api';

// 通用的请求函数
async function sendRequest(endpoint, action, data) {
    // 根据环境选择基础 URL
    const base = import.meta.env.DEV ? DEV_API_BASE : PROD_API_BASE;
    const url = `${base}/${endpoint}?action=${action}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error("收到非 JSON 响应:", text);
            return { success: false, error: "服务器返回了错误格式的内容" };
        }

        const result = await response.json();
        if (!response.ok) {
            return { success: false, error: result.error || `HTTP 错误: ${response.status}` };
        }
        return result;
    } catch (error) {
        console.error(`请求到 ${url} 失败:`, error);
        return { success: false, error: '网络连接失败，请检查后端服务是否正常' };
    }
}

// 认证相关的 API
export const register = (phone, password) => sendRequest('auth', 'register', { phone, password });
export const login = (phone, password) => sendRequest('auth', 'login', { phone, password });

// 游戏相关的 API
export const fetchSegment = (userId, roomId, segment, trackId) => sendRequest('game', 'fetch_segment', { user_id: userId, room_id: roomId, segment, track_id: trackId });
export const submitHand = (userId, roomId, roundId, trackId, head, mid, tail) => sendRequest('game', 'submit', { user_id: userId, room_id: roomId, round_id: roundId, track_id: trackId, head, mid, tail });
