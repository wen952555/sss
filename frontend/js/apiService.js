// frontend/js/apiService.js

// !! 重要: 将 'http://9525.ip-ddns.com/api.php' 替换为您 Serv00 后端的实际URL !!
const backendBaseUrl = 'http://9525.ip-ddns.com'; // 假设 api.php 在 Serv00 域名的根目录
// 如果 api.php 在子目录，例如 public_html/mygame/api.php, 则URL应为:
// const backendBaseUrl = 'http://9525.ip-ddns.com/mygame';

const apiUrl = `${backendBaseUrl}/api.php`; // Serv00 部署地址


export async function fetchFromServer(action, options = {}) {
    const url = new URL(apiUrl);
    url.searchParams.append('action', action);

    // 如果是GET请求且有params，附加到URL
    if (options.method === 'GET' && options.params) {
        for (const key in options.params) {
            url.searchParams.append(key, options.params[key]);
        }
    }

    const fetchOptions = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { message: `HTTP error! Status: ${response.status} - ${response.statusText}` };
        }
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json(); // 后端总是返回JSON
}


export async function fetchDeal() {
    // 后端返回的数据结构是 {success: true, data: {hand: [], message: ""}}
    const response = await fetchFromServer('deal');
    if (response.success) {
        return response.data; // 返回 {hand: [], message: ""}
    } else {
        throw new Error(response.message || 'Failed to deal cards from server.');
    }
}

export async function testBackend() {
    const response = await fetchFromServer('test');
     if (response.success) {
        return response.data;
    } else {
        throw new Error(response.message || 'Failed to test backend.');
    }
}


// 示例：未来添加的功能
// export async function compareHands(arrangedHandsData) {
//     // arrangedHandsData 结构: { front: [card1, card2, ...], middle: [...], back: [...] }
//     // card 对象可以是 { value: 'ace', suit: 'spades' } 或仅 cardId，取决于后端需要什么
//     const response = await fetchFromServer('compareHands', {
//         method: 'POST',
//         body: arrangedHandsData
//     });
//     if (response.success) {
//         return response.data; // 返回比较结果
//     } else {
//         throw new Error(response.message || 'Failed to compare hands on server.');
//     }
// }
