// frontend/src/services/api.js
const API_BASE_URL = 'https://9526.ip-ddns.com/backend/api'; // *** 已修正此路径 ***

async function request(endpoint, method = 'GET', data = null) {
    const headers = {
        'Content-Type': 'application/json',
    };
    
    const config = {
        method: method,
        headers: headers,
        credentials: 'include', 
    };

    if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
    }

    let rawResponseText = ''; 

    try {
        // 构造完整的请求 URL
        const fullUrl = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        console.log(`API Request: ${method} ${fullUrl}`, data || ''); // 打印请求信息

        const response = await fetch(fullUrl, config);
        
        try {
            rawResponseText = await response.text(); 
        } catch (textError) {
            console.error(`API request to ${fullUrl}: Error reading response text:`, textError);
            if (!response.ok) { 
                throw new Error(`HTTP error ${response.status}: ${response.statusText} (and response text unreadable)`);
            }
        }

        if (!response.ok) {
            console.error(`API request to ${fullUrl} FAILED with status ${response.status}. Raw Response Text:`, rawResponseText);
            let errorData;
            try {
                errorData = JSON.parse(rawResponseText);
                // 如果能解析出JSON，并且有message字段，就用它
                 throw new Error(errorData?.message || `HTTP error ${response.status}. Raw JSON Error: ${rawResponseText.substring(0, 500)}`);
            } catch (e) {
                // 不是JSON错误响应，或者JSON无效
                throw new Error(`HTTP error ${response.status}: ${response.statusText}. Raw non-JSON response: ${rawResponseText.substring(0, 500)}`);
            }
        }
        
        if (response.status === 204) { 
            console.log(`API request to ${fullUrl} returned 204 No Content.`);
            return null; 
        }

        try {
            const jsonData = JSON.parse(rawResponseText); 
            console.log(`API request to ${fullUrl} SUCCEEDED. Status: ${response.status}. Parsed JSON:`, jsonData);
            return jsonData;
        } catch (e) {
            console.error(`API request to ${fullUrl} SUCCEEDED with status ${response.status}, but FAILED to parse response as JSON. Raw Response Text:`, rawResponseText);
            throw new Error(`Received non-JSON response from server even though status was OK. Raw: ${rawResponseText.substring(0,500)}`);
        }

    } catch (error) { 
        console.error(`API request to ${API_BASE_URL}${endpoint} caught a general error:`, error.message);
        if (rawResponseText) {
            console.error(`Raw response text during error for ${API_BASE_URL}${endpoint}:`, rawResponseText.substring(0, 500));
        }
        throw error; 
    }
}

export const authApi = {
    register: (phoneNumber, password) => request('/register.php', 'POST', { phone_number: phoneNumber, password }),
    login: (phoneNumber, password) => request('/login.php', 'POST', { phone_number: phoneNumber, password }),
    logout: () => request('/logout.php', 'POST'),
    getUser: () => request('/get_user.php', 'GET'),
};

export const pointsApi = {
    // ... (将来添加)
};
