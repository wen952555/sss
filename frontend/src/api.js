const API_BASE = '/api'; // 基础路径，由 _worker.js 或本地开发服务器处理

// 通用的请求函数
async function sendRequest(endpoint, action, data) {
    const url = `${API_BASE}/${endpoint}?action=${action}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            // 如果服务器返回非 2xx 状态码，也作为错误处理
            const errorInfo = await response.json().catch(() => ({ error: '无法解析错误信息' }));
            return { success: false, error: errorInfo.error || `HTTP 错误: ${response.status}` };
        }
        return await response.json();
    } catch (error) {
        // 捕获网络错误等
        console.error(`请求到 ${url} 失败:`, error);
        return { success: false, error: '网络错误，请稍后重试' };
    }
}

// 认证相关的 API
export const register = (phone, password) => sendRequest('auth', 'register', { phone, password });
export const login = (phone, password) => sendRequest('auth', 'login', { phone, password });

// 游戏相关的 API
export const fetchSegment = (userId, roomId, segment, trackId) => sendRequest('game', 'fetch_segment', { user_id: userId, room_id: roomId, segment, track_id: trackId });
export const submitHand = (userId, roomId, roundId, trackId, head, mid, tail) => sendRequest('game', 'submit', { user_id: userId, room_id: roomId, round_id: roundId, track_id: trackId, head, mid, tail });
