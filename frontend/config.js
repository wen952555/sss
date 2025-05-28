// frontend/config.js
console.log("config.js: 文件开始执行。");

const CONFIG = {
    // 【重要】请将下面的URL替换为你的后端API实际基础路径
    // 例如 'https://9526.ip-ddns.com/backend/api'
    // 如果你的 deal_cards.php 直接在 https://9526.ip-ddns.com/deal_cards.php，那么这里就是 'https://9526.ip-ddns.com'
    API_BASE_URL: 'https://9526.ip-ddns.com/backend/api', // 【请务必检查并修改为你正确的URL】

    CARD_IMAGE_PATH: './assets/images/' // 假设你的图片路径是这个
};

console.log("config.js: CONFIG 对象已创建:", CONFIG);
if (typeof CONFIG.API_BASE_URL !== 'string' || CONFIG.API_BASE_URL === '') {
    console.error("config.js: 严重错误 - API_BASE_URL 未正确配置!");
    alert("前端配置错误：API基础URL未设置！请检查config.js。");
}
