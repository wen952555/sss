// frontend/script.js
console.log("script.js: 文件开始加载。");

// 等待 DOM 完全加载后再执行主要逻辑
document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js: DOMContentLoaded 事件已触发。脚本主逻辑开始执行。");

    // --- DOM 元素获取 ---
    console.log("script.js: 正在获取DOM元素...");
    const messageArea = document.getElementById('message-area');
    const dealButton = document.getElementById('dealButton');
    // 其他元素获取可以暂时省略，我们先关注发牌按钮和消息区
    if (messageArea) {
        console.log("script.js: messageArea 元素获取成功。");
        messageArea.textContent = "脚本已加载，等待操作。";
    } else {
        console.error("script.js: 严重错误 - 未能获取到 'message-area' 元素！");
        alert("页面结构错误：缺少 message-area 元素。");
        return; // 如果关键元素缺失，不继续执行
    }
    if (!dealButton) {
        console.error("script.js: 严重错误 - 未能获取到 'dealButton' 元素！");
        messageArea.textContent = "错误：发牌按钮未找到！";
        alert("页面结构错误：缺少 dealButton 元素。");
        return; // 如果发牌按钮缺失，不继续执行
    }
    console.log("script.js: dealButton 元素获取成功。");

    // --- 检查 CONFIG 对象和 API_BASE_URL ---
    console.log("script.js: 正在检查 CONFIG 对象...");
    if (typeof CONFIG === 'undefined' || CONFIG === null) {
        console.error("script.js: 严重错误 - CONFIG 对象未定义！请确保 config.js 已正确加载并在 script.js 之前。");
        messageArea.textContent = "错误：前端配置 (CONFIG) 未加载！";
        alert("前端配置错误：CONFIG 对象未加载！");
        dealButton.disabled = true;
        return;
    }
    console.log("script.js: CONFIG 对象存在:", CONFIG);

    if (typeof CONFIG.API_BASE_URL !== 'string' || CONFIG.API_BASE_URL.trim() === '') {
        console.error("script.js: 严重错误 - CONFIG.API_BASE_URL 无效！值为:", CONFIG.API_BASE_URL);
        messageArea.textContent = "错误：API基础URL配置无效！";
        alert("前端配置错误：API_BASE_URL 无效！");
        dealButton.disabled = true;
        return;
    }
    const API_BASE_URL = CONFIG.API_BASE_URL; // 在这个作用域内获取一次
    console.log("script.js: API_BASE_URL 已确认:", API_BASE_URL);


    // --- 简单的 fetch 函数封装，用于测试 ---
    async function verySimpleFetchTest(url) {
        console.log(`script.js: verySimpleFetchTest - 准备请求 URL: ${url}`);
        messageArea.textContent = `正在尝试连接: ${url}`;
        try {
            const response = await fetch(url); // 直接使用 fetch
            console.log(`script.js: verySimpleFetchTest - 收到响应对象 for ${url}:`, response);
            messageArea.textContent = `收到服务器响应 (状态: ${response.status})。正在解析...`;

            if (!response.ok) {
                const errorText = `HTTP error! Status: ${response.status} for ${url}`;
                console.error("script.js: verySimpleFetchTest - HTTP 错误:", errorText);
                messageArea.textContent = `连接错误: ${errorText}`;
                throw new Error(errorText);
            }

            const data = await response.json();
            console.log(`script.js: verySimpleFetchTest - JSON 解析成功 for ${url}:`, data);
            messageArea.textContent = `从服务器获取消息: ${data.message || JSON.stringify(data)}`;
            return data;

        } catch (error) {
            console.error(`script.js: verySimpleFetchTest - 请求 ${url} 失败:`, error);
            messageArea.textContent = `请求失败: ${error.message}`;
            // 如果错误是 "TypeError: Failed to fetch", 通常是网络问题或CORS问题
            // 如果错误是 "SyntaxError: Unexpected token ... in JSON", 是后端返回的不是有效JSON
            throw error;
        }
    }

    // --- 发牌按钮事件监听器 ---
    console.log("script.js: 准备为 dealButton 绑定点击事件监听器。");
    dealButton.addEventListener('click', async () => {
        console.log("script.js: dealButton 被点击！");
        dealButton.disabled = true; // 防止重复点击
        messageArea.textContent = "发牌按钮已点击，正在处理...";

        const endpoint = 'deal_cards.php'; // API的端点
        const fullApiUrl = `${API_BASE_URL}/${endpoint}`;
        console.log(`script.js: 目标API URL: ${fullApiUrl}`);

        try {
            await verySimpleFetchTest(fullApiUrl);
            // 如果成功，verySimpleFetchTest 内部会更新 messageArea
        } catch (error) {
            // verySimpleFetchTest 内部已经打印了错误并更新了 messageArea
            // 这里可以不用再做什么，或者只做一些额外的清理
            console.log("script.js: dealButton 点击事件的 catch 块捕获到错误（通常已被内部处理）。");
        } finally {
            console.log("script.js: dealButton 点击事件的 finally 块执行。");
            dealButton.disabled = false; // 无论成功或失败，都恢复按钮
        }
    });
    console.log("script.js: dealButton 点击事件监听器已成功绑定。");

    messageArea.textContent = "页面和脚本初始化完成。请点击“发牌”按钮测试。";
    console.log("script.js: 脚本主逻辑执行完毕。");
});

// 这个日志在 DOMContentLoaded 之前执行
console.log("script.js: 文件加载结束（但在 DOMContentLoaded 事件触发前）。");
