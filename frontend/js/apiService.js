// frontend/js/apiService.js

const backendBaseUrl = 'https://xxx.9525.ip-ddns.com'; // !! 确保是正确的HTTPS URL !! 请替换 xxx
const apiUrl = `${backendBaseUrl}/api.php`;

export async function fetchFromServer(action, options = {}) {
    const url = new URL(apiUrl);
    url.searchParams.append('action', action);

    if (options.method?.toUpperCase() === 'GET' && options.params) {
        for (const key in options.params) {
            if (options.params.hasOwnProperty(key)) {
                url.searchParams.append(key, options.params[key]);
            }
        }
    }

    const fetchOptions = {
        method: options.method?.toUpperCase() || 'GET',
        headers: { ...options.headers },
        // credentials: 'omit', // 根据需要设置，例如 'include' for cookies
        // mode: 'cors', // 默认就是cors
    };
    
    if (fetchOptions.method !== 'GET' && fetchOptions.method !== 'HEAD') {
        if (!fetchOptions.headers['Content-Type'] && options.body) {
            fetchOptions.headers['Content-Type'] = 'application/json; charset=utf-8';
        }
        if (options.body) { // 只有当options.body存在时才处理
            if (typeof options.body !== 'string') {
                try {
                    fetchOptions.body = JSON.stringify(options.body);
                } catch (stringifyError) {
                    console.error(`Failed to stringify body for action "${action}":`, stringifyError);
                    throw new Error(`Invalid request body: ${stringifyError.message}`);
                }
            } else {
                fetchOptions.body = options.body;
            }
        }
    }

    let response;
    try {
        response = await fetch(url.toString(), fetchOptions);
    } catch (networkError) {
        console.error(`Network error when fetching action "${action}":`, networkError);
        throw new Error(`Network error: ${networkError.message || 'Failed to connect to server'}`);
    }
    
    const responseContentType = response.headers.get("content-type");

    if (!response.ok) {
        let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        if (responseContentType && responseContentType.includes("application/json")) {
            try {
                const errorJson = await response.json();
                errorMessage = errorJson.message || errorMessage; // 优先使用后端返回的message
                if (errorJson.data && errorJson.data.errors) { // 如果有更详细的错误
                    errorMessage += ` Details: ${JSON.stringify(errorJson.data.errors)}`;
                }
            } catch (e) { /* 忽略json解析错误，使用原始HTTP错误 */ }
        } else { // 非JSON错误响应
            try {
                const errorText = await response.text();
                if (errorText) errorMessage += ` - Server response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`;
            } catch (e) { /* 忽略文本获取错误 */ }
        }
        throw new Error(errorMessage);
    }
    
    if (response.status === 204 || !responseContentType) { // No Content or no content type
        return { success: true, data: null, message: "Operation successful, no content returned." };
    }

    if (!responseContentType || !responseContentType.includes("application/json")) {
        const responseText = await response.text();
        console.warn(`Response for action "${action}" was not JSON. Content-Type: ${responseContentType}. Body:`, responseText.substring(0,500));
        throw new Error("Received non-JSON response from server. Content-Type: " + responseContentType);
    }

    try {
        const jsonData = await response.json();
        if (typeof jsonData.success === 'undefined') {
            console.warn(`Response for action "${action}" is JSON but missing 'success' field.`, jsonData);
            throw new Error("Server response format error (missing 'success' field).");
        }
        return jsonData;
    } catch (e) {
        // response.json() 失败，或者上面的 new Error
        const responseTextForError = await response.text().catch(() => "Could not get response text after JSON parse failure."); // 尝试获取文本
        console.error(`Failed to parse JSON response for action "${action}". Error: ${e.message}. Response text:`, responseTextForError.substring(0, 500));
        throw new Error(`JSON parsing failed: ${e.message}. Check server logs for PHP errors.`);
    }
}

export async function fetchDeal() {
    const response = await fetchFromServer('deal');
    if (response.success && response.data && Array.isArray(response.data.hand)) {
        return response.data;
    }
    throw new Error(response.message || 'Failed to deal cards or invalid data from server.');
}

export async function testBackend() {
    return fetchFromServer('test'); // 直接返回promise，让调用者处理
}

export async function testEvaluateHand() {
    const response = await fetchFromServer('evaluateTest');
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to test hand evaluation.');
}

export async function submitArrangedHands(arrangedHandsData) {
    const response = await fetchFromServer('submitArrangedHands', {
        method: 'POST',
        body: arrangedHandsData
    });
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to submit hands.');
}
