// frontend/script.js
console.log("script.js: 文件开始加载。");

document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js: DOMContentLoaded 事件已触发。");

    let messageArea = document.getElementById('message-area');
    let dealButton = document.getElementById('dealButton');
    let playerHandDiv = document.getElementById('player-hand'); // 获取手牌显示区域
    // 摆牌区的div也需要获取，但我们先专注于显示手牌
    let arrangedHeadDiv = document.getElementById('arranged-head');
    let arrangedMiddleDiv = document.getElementById('arranged-middle');
    let arrangedTailDiv = document.getElementById('arranged-tail');

    let API_BASE_URL = '';
    let CARD_IMAGE_PATH = './assets/images/'; // 默认值

    // 检查和设置CONFIG
    if (typeof CONFIG !== 'undefined' && CONFIG) {
        if (typeof CONFIG.API_BASE_URL === 'string' && CONFIG.API_BASE_URL.trim() !== '') {
            API_BASE_URL = CONFIG.API_BASE_URL;
            console.log("script.js: API_BASE_URL 已确认:", API_BASE_URL);
        } else {
            console.error("script.js: 严重错误 - CONFIG.API_BASE_URL 无效！");
            if(messageArea) messageArea.textContent = "错误：API基础URL配置无效！";
            if(dealButton) dealButton.disabled = true;
            return;
        }
        if (typeof CONFIG.CARD_IMAGE_PATH === 'string') {
            CARD_IMAGE_PATH = CONFIG.CARD_IMAGE_PATH;
        }
    } else {
        console.error("script.js: 严重错误 - CONFIG 对象未定义！");
        if(messageArea) messageArea.textContent = "错误：前端配置 (CONFIG) 未加载！";
        if(dealButton) dealButton.disabled = true;
        return;
    }

    let currentHand = []; // 存储当前手牌
    // let arrangedCards = { head: [], middle: [], tail: [] }; // 暂时不用

    // --- 卡牌图片路径转换 ---
    function getCardImagePath(card) {
        if (!card || typeof card.suit !== 'string' || typeof card.rank !== 'string') {
            return '';
        }
        const suitName = card.suit.toLowerCase();
        let rankName = card.rank.toLowerCase();
        if (rankName === 'a') rankName = 'ace';
        else if (rankName === 'k') rankName = 'king';
        else if (rankName === 'q') rankName = 'queen';
        else if (rankName === 'j') rankName = 'jack';
        else if (rankName === 't') rankName = '10';
        return `${CARD_IMAGE_PATH}${suitName}_${rankName}.svg`;
    }

    // --- 渲染单张卡牌 ---
    function renderCardElement(cardData) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        // 为卡牌添加数据属性，方便后续操作
        cardDiv.dataset.id = cardData.id || `${cardData.suit}-${cardData.rank}`; // 如果后端没给ID，前端简单生成一个
        cardDiv.dataset.suit = cardData.suit;
        cardDiv.dataset.rank = cardData.rank;

        const imagePath = getCardImagePath(cardData);
        cardDiv.style.backgroundImage = `url('${imagePath}')`;
        // 后备文本，以防图片加载失败
        cardDiv.textContent = `${cardData.rank}${cardData.suit.charAt(0).toUpperCase()}`;
        cardDiv.style.color = 'transparent'; // 使文字在图片加载成功时不可见

        // 【TODO】: 在这里可以为卡牌添加点击或拖拽事件监听器
        // cardDiv.draggable = true;
        // cardDiv.addEventListener('dragstart', handleDragStart);
        // cardDiv.addEventListener('click', handleCardClick);

        return cardDiv;
    }

    // --- 显示手牌 ---
    function displayHand() {
        console.log("script.js: displayHand() 被调用. currentHand:", currentHand);
        if (!playerHandDiv) {
            console.error("script.js: displayHand - playerHandDiv 未找到!");
            return;
        }
        playerHandDiv.innerHTML = ''; // 清空旧的手牌显示
        if (currentHand && Array.isArray(currentHand)) {
            currentHand.forEach(card => {
                const cardElement = renderCardElement(card);
                playerHandDiv.appendChild(cardElement);
            });
            console.log("script.js: displayHand - 已渲染", currentHand.length, "张牌到playerHandDiv。");
        } else {
            console.error("script.js: displayHand - currentHand 无效或不是数组:", currentHand);
        }
    }

    // --- API 调用封装 (保持和上一版能工作的 verySimpleFetchTest 一致) ---
    async function verySimpleFetchTest(endpoint) {
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
            // messageArea 更新移到调用处，以便根据具体业务逻辑显示消息
            return data;
        } catch (error) {
            console.error(`script.js: verySimpleFetchTest - 请求 ${fullApiUrl} 失败:`, error);
            if(messageArea) messageArea.textContent = `请求失败: ${error.message}`;
            throw error;
        }
    }

    // --- 发牌按钮事件监听器 ---
    if (dealButton) {
        dealButton.addEventListener('click', async () => {
            console.log("================================================");
            console.log("script.js: EVENT HANDLER - dealButton 被点击！(时间戳:", Date.now(), ")");
            if(messageArea) messageArea.textContent = "发牌按钮事件处理开始...";

            try {
                dealButton.disabled = true;
                if(messageArea) messageArea.textContent = "正在从服务器获取手牌...";

                const endpoint = 'deal_cards.php';
                console.log(`script.js: EVENT HANDLER - 准备调用 verySimpleFetchTest for endpoint: ${endpoint}`);
                const data = await verySimpleFetchTest(endpoint);
                console.log("script.js: EVENT HANDLER - verySimpleFetchTest 调用已完成。返回的data:", data);

                if (data && data.success === true && data.hand && Array.isArray(data.hand)) {
                    console.log("script.js: EVENT HANDLER - 成功获取到手牌数据:", data.hand);
                    // 给每张牌添加一个前端唯一的ID，如果后端没提供的话
                    currentHand = data.hand.map((card, index) => ({
                        ...card,
                        id: card.id || `card-${Date.now()}-${index}`
                    }));
                    console.log("script.js: EVENT HANDLER - currentHand 处理完毕:", currentHand);

                    if(messageArea) messageArea.textContent = data.message || "手牌已获取，正在显示...";
                    displayHand(); // 【调用函数显示手牌】

                } else {
                    let errorMsg = "发牌失败或返回数据格式不正确。";
                    if (data && data.message) { errorMsg = data.message; }
                    else if (data) { errorMsg += " 原始数据: " + JSON.stringify(data).substring(0,100); }
                    console.error("script.js: EVENT HANDLER - ", errorMsg, "完整data:", data);
                    if(messageArea) messageArea.textContent = errorMsg;
                    currentHand = []; // 清空手牌
                    displayHand();    // 清空显示
                }

            } catch (error) {
                console.error("script.js: EVENT HANDLER - try 块捕获到错误:", error);
                // messageArea 的更新已在 verySimpleFetchTest 的 catch 中部分处理
                currentHand = []; // 出错时清空手牌
                displayHand();    // 清空显示
            } finally {
                console.log("script.js: EVENT HANDLER - 进入 finally 块。");
                dealButton.disabled = false;
                // updateButtonStates(); // 稍后恢复
                if(messageArea) messageArea.textContent += " (发牌操作结束)";
                console.log("script.js: EVENT HANDLER - dealButton 事件处理结束。");
                console.log("================================================");
            }
        });
        console.log("script.js: dealButton 点击事件监听器已成功绑定。");
    } else {
        console.error("script.js: 严重错误 - dealButton 未找到！");
    }

    if(messageArea) messageArea.textContent = "页面和脚本初始化完成。请点击“发牌”按钮。";
    console.log("script.js: 脚本主逻辑执行完毕。");
});

console.log("script.js: 文件加载结束。");
