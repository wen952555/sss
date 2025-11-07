const BASE_URL = '/api'; // 所有请求都将通过Cloudflare Worker代理

/**
 * 一个通用的API请求函数
 * @param {string} endpoint API端点, 例如 '/tables/status'
 * @param {object} options fetch函数的配置对象, 例如 { method: 'POST', body: JSON.stringify(data) }
 * @returns {Promise<any>} 解析后的JSON数据
 */
async function apiFetch(endpoint, options = {}) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${localStorage.getItem('token')}` // 未来添加Token认证
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: '请求失败，且无法解析错误信息' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error; // 将错误继续抛出，以便UI层可以捕获和处理
    }
}

// --- 具体API函数 ---

/**
 * 获取所有桌子的状态
 */
export const getTablesStatus = () => {
    return apiFetch('/tables/status');
};

/**
 * 加入一个桌子
 * @param {number} tableId 
 */
export const joinTable = (tableId) => {
    return apiFetch('/game/join_table', {
        method: 'POST',
        body: JSON.stringify({ table_id: tableId }),
    });
};

/**
 * 获取下一局要玩的牌
 * @param {number} tableId 
 */
export const getNextCard = (tableId) => {
    return apiFetch('/game/get_card', {
        method: 'GET', // 或POST，取决于设计
        // body: JSON.stringify({ table_id: tableId }), // 如果是POST
    });
};

/**
 * 提交理好的牌
 * @param {object} submissionData 
 */
export const submitHand = (submissionData) => {
    return apiFetch('/game/submit', {
        method: 'POST',
        body: JSON.stringify(submissionData),
    });
};

// ... 其他API函数