import axios from 'axios';

/**
 * 1. 扑克牌图片识别逻辑
 * 后端返回数字 1-52 代表普通牌，53 代表小王，54 代表大王
 * 映射规则建议：
 * 1-13: 黑桃 (Ace, 2-10, J, Q, K)
 * 14-26: 红桃
 * 27-39: 方块
 * 40-52: 梅花
 */
export const getCardImg = (val) => {
    // 处理大小王
    if (val === 53) return "/assets/cards/black_joker.svg";
    if (val === 54) return "/assets/cards/red_joker.svg";
    
    const suits = ["spades", "hearts", "diamonds", "clubs"];
    const values = ["ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king"];
    
    // 计算花色和点数 (假设后端 1 是黑桃A, 14 是红桃A)
    const suitIndex = Math.floor((val - 1) / 13);
    const valueIndex = (val - 1) % 13;
    
    const suit = suits[suitIndex];
    const value = values[valueIndex];
    
    // 对应你的文件名格式: 10_of_clubs.svg, ace_of_spades.svg
    return `/assets/cards/${value}_of_${suit}.svg`;
};

/**
 * 2. Axios 实例配置
 * 配合 _worker.js，所有请求发往 /api，会被代理到 Serv00
 */
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    }
});

// 请求拦截器：自动在所有请求中加入 Token
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        // 如果是 GET 请求，把 token 加在 URL 参数里
        if (config.method === 'get') {
            config.params = { ...config.params, token };
        } 
        // 如果是 POST 请求，把 token 加在 Body 里
        else if (config.method === 'post') {
            const params = new URLSearchParams(config.data);
            params.append('token', token);
            config.data = params;
        }
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// 响应拦截器：统一处理登录失效
api.interceptors.response.use(response => {
    return response;
}, error => {
    if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/auth';
    }
    return Promise.reject(error);
});

export default api;
