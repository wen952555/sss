import React from 'react';
import axios from 'axios';

// 扑克牌识别逻辑
export const getCardImg = (val) => {
    if (val === 53) return "/assets/cards/black_joker.svg";
    if (val === 54) return "/assets/cards/red_joker.svg";
    const suits = ["spades", "hearts", "diamonds", "clubs"];
    const values = ["ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king"];
    const suitIndex = Math.floor((val - 1) / 13);
    const valueIndex = (val - 1) % 13;
    return `/assets/cards/${values[valueIndex]}_of_${suits[suitIndex]}.svg`;
};

const api = axios.create({
    baseURL: '/api', // 通过 _worker.js 代理
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        // 十三水异步模式统一使用 URLSearchParams 格式
        const params = new URLSearchParams(config.data || "");
        if (config.method === 'post') {
            params.append('token', token);
            config.data = params;
        } else {
            config.params = { ...config.params, token };
        }
    }
    return config;
});

export default api;
