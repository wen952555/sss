// frontend/js/apiService.js

const backendBaseUrl = 'https://xxx.9525.ip-ddns.com'; // !! 确保是正确的HTTPS URL !!
const apiUrl = `${backendBaseUrl}/api.php`;

export async function fetchFromServer(action, options = {}) {
    const url = new URL(apiUrl);
    url.searchParams.append('action', action);

    if (options.method === 'GET' && options.params) {
        for (const key in options.params) {
            if (options.params.hasOwnProperty(key)) {
                url.searchParams.append(key, options.params[key]);
            }
        }
    }

    const fetchOptions = {
        method: options.method?.toUpperCase() || 'GET', //确保大写
        headers: { ...options.headers }, // 先复制传入的headers
    };
    
    // 为非GET/HEAD请求（如POST, PUT, DELETE）自动添加Content-Type: application/json
    if (fetchOptions.method !== 'GET' && fetchOptions.method !== 'HEAD') {
        // 只有当body存在且没有显式设置Content-Type时才添加，或者总是覆盖/添加
        if (!fetchOptions.headers['Content-Type'] && options.body) {
            fetchOptions.headers['Content-Type'] = 'application/json; charset=utf-8';
        } else if (options.body && !fetchOptions.headers['Content-Type']?.includes('json')) {
            // 如果有body但Content-Type不是json，也可能是个问题，但这里先信任传入的
        }
         if (options.body && typeof options.body !== 'string') { // 确保body是字符串
            fetchOptions.body = JSON.stringify(options.body);
        } else if (options.body) {
            fetchOptions.body = options.body;
        }
    }


    let response;
    try {
        response = await fetch(url.toString(), fetchOptions);
    } catch (networkError) { // 网络层面的错误 (e.g., DNS, CORS preflight failure handled by browser not reaching here directly but good practice)
        console.error(`Network error when fetching action "${action}":`, networkError);
        throw new Error(`Network error: ${networkError.message || 'Failed to connect to server'}`);
    }
    

    if (!response.ok) { // HTTP状态码不是2xx
        let errorData = { message: `Request failed with status ${response.status} ${response.statusText}` };
        try {
            // 尝试解析错误响应体为JSON
            const errorJson = await response.json();
            if (errorJson && errorJson.message) { // 如果后端返回了带message的JSON错误
                errorData = errorJson;
            } else if (errorJson) { // 如果是JSON但没有message字段
                errorData.details = errorJson;
            }
        } catch (e) {
            // 如果错误响应体不是JSON，尝试获取文本
            try {
                const errorText = await response.text();
                if (errorText) errorData.message += ` - Server response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`; // 截断过长的文本
            } catch (textError) { /* 忽略获取文本的错误 */ }
        }
        // errorData.message 现在应该包含了尽可能多的信息
        // errorData.data 可能包含了后端返回的完整错误信息（如果解析成功）
        throw new Error(errorData.message);
    }
    
    // 响应成功 (HTTP 2xx)
    const responseText = await response.text();
    if (!responseText) { // 空响应体
        console.warn(`Empty response for action "${action}". Assuming success with no data.`);
        return { success: true, data: null, message: "Operation successful with no data returned." };
    }

    try {
        const jsonData = JSON.parse(responseText);
        // 后端应该总是返回一个包含 success 字段的结构
        if (typeof jsonData.success === 'undefined') {
            console.warn(`Response for action "${action}" is valid JSON but missing 'success' field. Response:`, jsonData);
            // 可以选择抛出错误，或者尝试兼容
            // throw new Error("Server response format is missing 'success' field.");
            return { success: false, message: "Server response format error (missing 'success').", data: jsonData };
        }
        return jsonData;
    } catch (e) {
        console.error(`Failed to parse JSON response for action "${action}". Error: ${e.message}. Response text:`, responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
        throw new Error("Received non-JSON response from server, or JSON parsing failed.");
    }
}

// fetchDeal, testBackend, testEvaluateHand, submitArrangedHands 函数保持不变
// (请确保您使用的是上一版本提供的这些函数的完整代码)
export async function fetchDeal() { /* ... */ }
export async function testBackend() { /* ... */ }
export async function testEvaluateHand() { /* ... */ }
export async function submitArrangedHands(arrangedHandsData) { /* ... */ }
