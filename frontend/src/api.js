// frontend/src/api.js
const API_BASE = '/api'; // 经过 _worker.js 代理

export const request = async (action, data) => {
    const res = await fetch(`${API_BASE}?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
};