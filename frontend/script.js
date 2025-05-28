// frontend/script.js
console.log("script.js: 文件开始加载。");

document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js: DOMContentLoaded 事件已触发。脚本主逻辑开始执行。");

    // --- 【关键】将需要在多个地方使用的 DOM 元素定义在顶层作用域 ---
    let messageArea = null;
    let dealButton = null;
    let API_BASE_URL = ''; // 将 API_BASE_URL 也移到这里，以便在所有函数中可用

    // --- DOM 元素获取 ---
    console.log("script.js: 正在获取DOM元素...");
    messageArea = document.getElementById('message-area'); // 赋值给顶层变量
    dealButton = document.getElementById('dealButton');   // 赋值给顶层变量
    // 其他需要全局访问的元素也可以在这里获取并赋值

    if (!messageArea) {
        console.error("script.js: 严重错误 - 未能获取到 'message-area' 元素！");
        alert("页面结构错误：缺少 message-area 元素。");
        return;
    }
    console.log("script.js: messageArea 元素获取成功。");
    messageArea.textContent = "脚本已加载，等待操作。";

    if (!dealButton) {
        console.error("script.js: 严重错误 - 未能获取到 'dealButton' 元素！");
        if(messageArea) messageArea.textContent = "错误：发牌按钮未找到！";
        alert("页面结构错误：缺少 dealButton 元素。");
        return;
    }
    console.log("script.js: dealButton 元素获取成功。");


    // --- 检查 CONFIG 对象和 API_BASE_URL ---
    console.log("script.js: 正在检查 CONFIG 对象...");
    if (typeof CONFIG === 'undefined' || CONFIG === null) {
        console.error("script.js: 严重错误 - CONFIG 对象未定义！请确保 config.js 已正确加载并在 script.js 之前。");
        if(messageArea) messageArea.textContent = "错误：前端配置 (CONFIG) 未加载！";
        alert("前端配置错误：CONFIG 对象未加载！");
        if(dealButton) dealButton.disabled = true;
        return;
    }
    console.log("script.js: CONFIG 对象存在:", CONFIG);

    if (typeof CONFIG.API_BASE_URL !== 'string' || CONFIG.API_BASE_URL.trim() === '') {
        console.error("script.js: 严重错误 - CONFIG.API_BASE_URL 无效！值为:", CONFIG.API_BASE_URL);
        if(messageArea) messageArea.textContent = "错误：API基础URL配置无效！";
        alert("前端配置错误：API_BASE_URL 无效！");
        if(dealButton) dealButton.disabled = true;
        return;
    }
    API_BASE_URL = CONFIG.API_BASE_URL; // 赋值给顶层变量
    console.log("script.js: API_BASE_URL 已确认:", API_BASE_URL);

    // 其他 CONFIG 值也可以在这里获取
    const CARD_IMAGE_PATH = (typeof CONFIG.CARD_IMAGE_PATH === 'string') ? CONFIG.CARD_IMAGE_PATH : './assets/images/';


    // --- 简单的 fetch 函数封装 (这个函数现在可以访问顶层的 API_BASE_URL 和 messageArea) ---
    async function verySimpleFetchTest(endpoint) { // API_BASE_URL 现在是外部变量
        const fullApiUrl = `${API_BASE_URL}/${endpoint}`;
        console.log(`script.js: verySimpleFetchTest - 准备请求 URL: ${fullApiUrl}`);
        if(messageArea) messageArea.textContent = `正在尝试连接: ${fullApiUrl}`;
        try {
            const response = await fetch(fullApiUrl);
            console.log(`script.js: verySimpleFetchTest - 收到响应对象 for ${fullApiUrl}:`, response);
            if(messageArea) messageArea.textContent = `收到服务器响应 (状态: ${response.status})。正在解析...`;

            if (!response.ok) {
                const errorText = `HTTP error! Status: ${response.status} for ${fullApiUrl}`;
                console.error("script.js: verySimpleFetchTest - HTTP 错误:", errorText);
                if(messageArea) messageArea.textContent = `连接错误: ${errorText}`;
                throw new Error(errorText);
            }

            const data = await response.json();
            console.log(`script.js: verySimpleFetchTest - JSON 解析成功 for ${fullApiUrl}:`, data);
            if(messageArea) messageArea.textContent = `从服务器获取消息: ${data.message || JSON.stringify(data)}`;
            return data;

        } catch (error) {
            console.error(`script.js: verySimpleFetchTest - 请求 ${fullApiUrl} 失败:`, error);
            if(messageArea) messageArea.textContent = `请求失败: ${error.message}`;
            throw error;
        }
    }


    // --- 发牌按钮事件监听器 (现在可以正确访问 messageArea 和 dealButton) ---
    console.log("script.js: 准备为 dealButton 绑定点击事件监听器。");
    dealButton.addEventListener('click', async () => {
        console.log("================================================");
        console.log("script.js: EVENT HANDLER - dealButton 被点击！(时间戳:", Date.now(), ")");
        // 现在 messageArea 是在这个函数作用域之外定义的，可以访问
        if(messageArea) messageArea.textContent = "发牌按钮事件处理开始...";

        try {
            console.log("script.js: EVENT HANDLER - 进入 try 块。");
            dealButton.disabled = true; // dealButton 也是外部定义的
            if(messageArea) messageArea.textContent = "发牌按钮已点击，正在处理...";

            const endpoint = 'deal_cards.php';
            // API_BASE_URL 也是外部定义的
            console.log(`script.js: EVENT HANDLER - 目标API URL: ${API_BASE_URL}/${endpoint}`);


            if (typeof verySimpleFetchTest !== 'function') {
                console.error("script.js: EVENT HANDLER - 严重错误: verySimpleFetchTest 函数未定义!");
                if(messageArea) messageArea.textContent = "内部错误：网络请求函数丢失。";
                return;
            }

            console.log("script.js: EVENT HANDLER - 准备调用 verySimpleFetchTest。");
            const data = await verySimpleFetchTest(endpoint); // 直接传递 endpoint
            console.log("script.js: EVENT HANDLER - verySimpleFetchTest 调用已完成。返回的data:", data);

            // 【根据后端返回的真实牌局数据进行处理】
            if (data && data.success === true && data.hand && Array.isArray(data.hand)) {
                console.log("script.js: EVENT HANDLER - 成功获取到手牌数据:", data.hand);
                // currentHand = data.hand.map(...); // 你之前的逻辑
                // displayHand();
                if(messageArea) messageArea.textContent = data.message || "手牌已获取！";
            } else {
                let errorMsg = "发牌失败或返回数据格式不正确。";
                if (data && data.message) errorMsg = data.message;
                console.error("script.js: EVENT HANDLER - ", errorMsg, "完整data:", data);
                if(messageArea) messageArea.textContent = errorMsg;
            }

        } catch (error) {
            console.error("script.js: EVENT HANDLER - try 块捕获到错误:", error);
            if(messageArea && !messageArea.textContent.startsWith("请求失败:") && !messageArea.textContent.startsWith("连接错误:")) {
               messageArea.textContent = `发牌操作中发生前端错误: ${error.message}`;
            }
        } finally {
            console.log("script.js: EVENT HANDLER - 进入 finally 块。");
            dealButton.disabled = false;
            // updateButtonStates();
            if(messageArea) messageArea.textContent += " (操作结束)";
            console.log("script.js: EVENT HANDLER - dealButton 事件处理结束。");
            console.log("================================================");
        }
    });
    console.log("script.js: dealButton 点击事件监听器已成功绑定。");

    if(messageArea) messageArea.textContent = "页面和脚本初始化完成。请点击“发牌”按钮测试。";
    console.log("script.js: 脚本主逻辑执行完毕。");
});

console.log("script.js: 文件加载结束（但在 DOMContentLoaded 事件触发前）。");
