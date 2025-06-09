// frontend/src/services/api.js
const API_BASE_URL = 'https://9526.ip-ddns.com/backend/api'; // 你的后端 API URL

async function request(endpoint, method = 'GET', data = null) {
    const headers = {
        'Content-Type': 'application/json',
    };
    
    const config = {
        method: method,
        headers: headers,
        credentials: 'include', // 非常重要！发送和接收 cookies (用于会话)
    };

    if (data && method !== 'GET') { // GET请求不应该有body，参数通过URL传递
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        // 尝试解析JSON，即使响应状态不是 ok，后端可能仍然返回JSON错误信息
        let responseData;
        try {
            responseData = await response.json();
        } catch (e) {
            // 如果响应体不是JSON (例如，500错误返回HTML页面)
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
            // 如果响应ok但不是json (如204 No Content)，则responseData为undefined
            if (response.status === 204) return null;
        }

        if (!response.ok) {
            // 使用后端返回的错误信息（如果存在）
            throw new Error(responseData?.message || `HTTP error ${response.status}`);
        }
        
        return responseData; // 对于成功的请求，返回解析后的JSON数据
    } catch (error) {
        console.error(`API request to ${endpoint} failed:`, error.message);
        throw error; // 重新抛出错误，让调用者处理
    }
}

export const authApi = {
    register: (phoneNumber, password) => request('/register.php', 'POST', { phone_number: phoneNumber, password }),
    login: (phoneNumber, password) => request('/login.php', 'POST', { phone_number: phoneNumber, password }),
    logout: () => request('/logout.php', 'POST'), // 通常是POST来执行操作
    getUser: () => request('/get_user.php', 'GET'), // 获取当前登录用户信息
};

// 积分相关的API可以后续添加
export const pointsApi = {
    // transfer: (toPhoneNumber, amount) => request('/transfer_points.php', 'POST', { to_phone_number: toPhoneNumber, amount }),
};
