// frontend/js/apiService.js
const backendBaseUrl = 'https://xxx.9525.ip-ddns.com'; // !! 修改为您的后端URL !!
const apiUrl = `${backendBaseUrl}/api.php`;

export async function fetchFromServer(action, options = {}) {
    const url = new URL(apiUrl); url.searchParams.append('action', action);
    if (options.method === 'GET' && options.params) {
        for (const key in options.params) url.searchParams.append(key, options.params[key]);
    }
    const fetchOptions = { method: options.method || 'GET', headers: { ...options.headers, }, };
    if (options.method && options.method.toUpperCase() !== 'GET' && options.method.toUpperCase() !== 'HEAD') {
        fetchOptions.headers['Content-Type'] = 'application/json';
    }
    if (options.body) fetchOptions.body = JSON.stringify(options.body);

    const response = await fetch(url.toString(), fetchOptions);
    if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); }
        catch (e) { const textError = await response.text().catch(() => `HTTP error! Status: ${response.status}`);
            errorData = { message: textError || `Request failed with status ${response.status}` }; }
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    const responseText = await response.text();
    try { return JSON.parse(responseText); }
    catch (e) { console.warn("Response was not valid JSON:", responseText);
        return { success: false, message: "Received non-JSON response from server", data: responseText }; }
}

export async function fetchDeal() {
    const response = await fetchFromServer('deal');
    if (response.success && response.data && response.data.hand) return response.data;
    else throw new Error(response.message || 'Failed to deal cards or invalid data format.');
}
export async function testBackend() {
    const response = await fetchFromServer('test');
    if (response.success && response.data) return response.data;
    else throw new Error(response.message || 'Failed to test backend or invalid data format.');
}
export async function testEvaluateHand() {
    const response = await fetchFromServer('evaluateTest');
    if (response.success && response.data) return response.data;
    else throw new Error(response.message || 'Failed to test hand evaluation or invalid data format.');
}
export async function submitArrangedHands(arrangedHandsData) {
    const response = await fetchFromServer('submitArrangedHands', { method: 'POST', body: arrangedHandsData });
    if (response.success && response.data) return response.data;
    else throw new Error(response.message || 'Failed to submit hands or invalid data from server.');
}
