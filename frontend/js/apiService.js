// frontend/js/apiService.js

const backendBaseUrl = 'https://xxx.9525.ip-ddns.com'; // !! 确保是正确的HTTPS URL !! 请替换 xxx
const apiUrl = `${backendBaseUrl}/api.php`;

export async function fetchFromServer(action, options = {}) {
    const url = new URL(apiUrl);
    url.searchParams.append('action', action);

    const fetchOptions = {
        method: options.method?.toUpperCase() || 'GET',
        headers: { ...options.headers }, // 先复制传入的headers
        // credentials: 'omit', 
    };
    
    // === 极端测试：针对POST请求，尝试不同的 Content-Type 或不设置 ===
    if (fetchOptions.method === 'POST' && options.body) {
        // 测试1: 尝试使用表单编码类型 (如果后端能处理，通常PHP $_POST可以直接用)
        // fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
        // let formBody = [];
        // // 假设 options.body 是一个简单对象,需要转换成 key=value&key2=value2 格式
        // // 对于我们现在的 arrangedHandsData 这种复杂JSON，这种转换不直接适用，除非后端修改
        // // for (var property in options.body) {
        // //   var encodedKey = encodeURIComponent(property);
        // //   var encodedValue = encodeURIComponent(options.body[property]);
        // //   formBody.push(encodedKey + "=" + encodedValue);
        // // }
        // // fetchOptions.body = formBody.join("&");

        // 测试2: 尝试完全不设置 Content-Type (浏览器可能会根据body自动设置，或者不设置)
        // delete fetchOptions.headers['Content-Type']; 
        // fetchOptions.body = JSON.stringify(options.body); // body 仍然是JSON字符串

        // 测试3: 保持原来的 application/json (这是我们正常情况下的设置)
        fetchOptions.headers['Content-Type'] = 'application/json; charset=utf-8';
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

    } else if (fetchOptions.method === 'GET' && options.params) { // GET 请求参数处理
        for (const key in options.params) {
            if (options.params.hasOwnProperty(key)) {
                url.searchParams.append(key, options.params[key]);
            }
        }
    }


    let response;
    try {
        console.log(`Fetching action "${action}" with options:`, fetchOptions); // 打印请求选项
        response = await fetch(url.toString(), fetchOptions);
    } catch (networkError) {
        console.error(`Network error when fetching action "${action}":`, networkError);
        throw new Error(`Network error: ${networkError.message || 'Failed to connect to server'}`);
    }
    
    const responseContentType = response.headers.get("content-type");
    console.log(`Response for "${action}": Status=${response.status}, Content-Type=${responseContentType}`);


    if (!response.ok) {
        // ... (错误处理部分与上一版本相同，为简洁省略)
        let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        // ...
        throw new Error(errorMessage);
    }
    
    if (response.status === 204 || !responseContentType) { /* ... */ }
    if (!responseContentType || !responseContentType.includes("application/json")) { /* ... */ }

    try {
        const jsonData = await response.json();
        // ... (JSON处理部分与上一版本相同，为简洁省略)
        return jsonData;
    } catch (e) {
        // ... (JSON解析错误处理部分与上一版本相同，为简洁省略)
        const responseTextForError = await response.text().catch(() => "Could not get response text after JSON parse failure.");
        console.error(`Failed to parse JSON response for action "${action}". Error: ${e.message}. Response text:`, responseTextForError.substring(0, 500));
        throw new Error(`JSON parsing failed: ${e.message}. Check server logs for PHP errors.`);
    }
}

// fetchDeal, testBackend, testEvaluateHand, submitArrangedHands 函数保持不变
// (请确保您使用的是上一版本提供的这些函数的完整代码)
export async function fetchDeal() { return fetchFromServer('deal'); }
export async function testBackend() { return fetchFromServer('test'); }
export async function testEvaluateHand() { /* ... */ }
export async function submitArrangedHands(arrangedHandsData) { /* ... */ }
