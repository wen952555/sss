// frontend/config.js
console.log("config.js: FINAL_DEBUG_PATH_FIX - 文件开始执行。");

const CONFIG = {
    // API服务器基础URL - 你的PHP后端API所在的基础路径
    API_BASE_URL: 'https://9526.ip-ddns.com/backend/api', // 【请再次确认这个API URL是正确的】

    // 图片服务器基础URL - 【根据你的提示，修改为包含 /frontend/ 的路径】
    IMAGE_SERVER_BASE_URL: 'https://xxx.9525.ip-ddns.com/frontend/assets/images/' // 【请确认这个路径能访问到图片！】
};

console.log("config.js: FINAL_DEBUG_PATH_FIX - CONFIG 对象已创建:", CONFIG);

if (!CONFIG.API_BASE_URL || !CONFIG.IMAGE_SERVER_BASE_URL || CONFIG.API_BASE_URL.trim() === '' || CONFIG.IMAGE_SERVER_BASE_URL.trim() === '') {
    const errorMsg = "config.js: FATAL ERROR - API_BASE_URL 或 IMAGE_SERVER_BASE_URL 未正确配置或为空字符串!";
    console.error(errorMsg, CONFIG);
    alert(errorMsg + "\n请检查 frontend/config.js 文件。");
}
