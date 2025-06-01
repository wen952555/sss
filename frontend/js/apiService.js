// frontend/js/apiService.js

// !! 重要: 确保 backendBaseUrl 指向您 Serv00 后端的实际HTTPS URL !!
const backendBaseUrl = 'https://9525.ip-ddns.com'; // 示例，请替换
const apiUrl = `${backendBaseUrl}/api.php`;


export async function fetchFromServer(action, options = {}) {
    const url = new URL(apiUrl);
    url.searchParams.append('action', action);

    if (options.method === 'GET' && options.params) {
        for (const key in options.params) {
            url.searchParams.append(key, options.params[key]);
        }
    }

    const fetchOptions = {
        method: options.method || 'GET',
        headers: {
            // 'Content-Type': 'application/json', // 对于 GET 请求不需要 Content-Type
            ...options.headers,
        },
    };
    
    if (options.method && options.method.toUpperCase() !== 'GET' && options.method.toUpperCase() !== 'HEAD') {
        fetchOptions.headers['Content-Type'] = 'application/json'; // 只为非GET/HEAD请求设置
    }


    if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            // 如果响应不是JSON，或者网络错误等，response.json()会失败
            const textError = await response.text().catch(() => `HTTP error! Status: ${response.status}`);
            errorData = { message: textError || `Request failed with status ${response.status}` };
        }
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    
    // 尝试解析为JSON，如果失败则返回文本 (以防后端有时不返回JSON)
    const responseText = await response.text();
    try {
        return JSON.parse(responseText);
    } catch (e) {
        console.warn("Response was not valid JSON:", responseText);
        // 根据需要，你可以决定是抛出错误还是返回文本
        // throw new Error("Received non-JSON response from server.");
        return { success: false, message: "Received non-JSON response from server", data: responseText }; // 或者返回一个错误对象
    }
}


export async function fetchDeal() {
    const response = await fetchFromServer('deal');
    if (response.success && response.data && response.data.hand) {
        return response.data;
    } else {
        throw new Error(response.message || 'Failed to deal cards or invalid data format from server.');
    }
}

export async function testBackend() {
    const response = await fetchFromServer('test');
     if (response.success && response.data) {
        return response.data;
    } else {
        throw new Error(response.message || 'Failed to test backend or invalid data format.');
    }
}

export async function testEvaluateHand() { // 新增一个用于前端调用后端测试评估的函数 (可选)
    const response = await fetchFromServer('evaluateTest');
    if (response.success && response.data) {
        return response.data;
    } else {
        throw new Error(response.message || 'Failed to test hand evaluation or invalid data format.');
    }
}

/**
 * 提交摆好的三道牌到后端进行评估和规则校验
 * @param {Object} arrangedHandsData - 包含三道牌的对象
 * e.g., { front: [{value:'a', suit:'s'},...], middle: [...], back: [...] }
 * @returns {Promise<Object>} 后端返回的评估结果
 */
export async function submitArrangedHands(arrangedHandsData) {
    const response = await fetchFromServer('submitArrangedHands', {
        method: 'POST',
        body: arrangedHandsData // fetchFromServer 会自动 JSON.stringify
    });
    // 后端应该返回 { success: true, data: { validation_result }, message: "..." }
    if (response.success && response.data) {
        return response.data;
    } else {
        throw new Error(response.message || 'Failed to submit hands or invalid data from server.');
    }
}
