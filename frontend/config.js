// frontend/config.js
console.log("config.js: FINAL_DEBUG_PATH_CORRECTED - 文件开始执行。");

const CONFIG = {
    // API服务器基础URL - 你的PHP后端API所在的基础路径
    API_BASE_URL: 'https://9526.ip-ddns.com/backend/api', // 【请再次确认这个API URL是正确的】

    // 【关键修改】图片服务器基础URL - 去掉 /frontend/
    // 根据你之前的测试，https://xxx.9525.ip-ddns.com/assets/images/h_10.png 是可以访问的
    IMAGE_SERVER_BASE_URL: 'https://xxx.9525.ip-ddns.com/assets/images/'
};

console.log("config.js: FINAL_DEBUG_PATH_CORRECTED - CONFIG 对象已创建:", CONFIG);

if (!CONFIG.API_BASE_URL || !CONFIG.IMAGE_SERVER_BASE_URL || CONFIG.API_BASE_URL.trim() === '' || CONFIG.IMAGE_SERVER_BASE_URL.trim() === '') {
    const errorMsg = "config.js: FATAL ERROR - API_BASE_URL 或 IMAGE_SERVER_BASE_URL 未正确配置或为空字符串!";
    console.error(errorMsg, CONFIG);
    alert(errorMsg + "\n请检查 frontend/config.js 文件。");
}
