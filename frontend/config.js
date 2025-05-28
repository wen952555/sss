// frontend/config.js
console.log("config.js: FINAL_DEBUG - 文件开始执行。");

const CONFIG = {
    // 【API服务器基础URL - 你的PHP后端API所在的基础路径】
    // 例如: 'https://9526.ip-ddns.com/backend/api'
    API_BASE_URL: 'https://9526.ip-ddns.com/backend/api',

    // 【图片服务器基础URL - 你的PNG图片存放的基础路径】
    // 根据你之前的测试，这个应该是 'https://xxx.9525.ip-ddns.com/assets/images/'
    IMAGE_SERVER_BASE_URL: 'https://xxx.9525.ip-ddns.com/assets/images/'
};

console.log("config.js: FINAL_DEBUG - CONFIG 对象已创建:", CONFIG);

if (!CONFIG.API_BASE_URL || !CONFIG.IMAGE_SERVER_BASE_URL) {
    const errorMsg = "config.js: FATAL ERROR - API_BASE_URL 或 IMAGE_SERVER_BASE_URL 未正确配置!";
    console.error(errorMsg, CONFIG);
    alert(errorMsg + "\n请检查 frontend/config.js 文件。");
}
