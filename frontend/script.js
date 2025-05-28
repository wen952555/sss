// frontend/script.js
console.log("script.js: 文件开始加载。");

document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js: DOMContentLoaded 事件触发。");

    // --- DOM 元素获取 ---
    const playerHandDiv = document.getElementById('player-hand');
    const arrangedHeadDiv = document.getElementById('arranged-head');
    const arrangedMiddleDiv = document.getElementById('arranged-middle');
    const arrangedTailDiv = document.getElementById('arranged-tail');
    const dealButton = document.getElementById('dealButton');
    const submitButton = document.getElementById('submitButton');
    const resetButton = document.getElementById('resetButton');
    const messageArea = document.getElementById('message-area');

    // 检查DOM元素是否都获取成功
    if (!playerHandDiv) console.error("script.js: 错误 - 未找到ID为 'player-hand' 的元素！");
    if (!arrangedHeadDiv) console.error("script.js: 错误 - 未找到ID为 'arranged-head' 的元素！");
    if (!arrangedMiddleDiv) console.error("script.js: 错误 - 未找到ID为 'arranged-middle' 的元素！");
    if (!arrangedTailDiv) console.error("script.js: 错误 - 未找到ID为 'arranged-tail' 的元素！");
    if (!dealButton) console.error("script.js: 错误 - 未找到ID为 'dealButton' 的元素！");
    if (!submitButton) console.error("script.js: 错误 - 未找到ID为 'submitButton' 的元素！");
    if (!resetButton) console.error("script.js: 错误 - 未找到ID为 'resetButton' 的元素！");
    if (!messageArea) console.error("script.js: 错误 - 未找到ID为 'message-area' 的元素！");

    const arrangementZones = {
        head: arrangedHeadDiv,
        middle: arrangedMiddleDiv,
        tail: arrangedTailDiv
    };

    // --- 检查CONFIG对象和API_BASE_URL ---
    let API_BASE_URL = '';
    if (typeof CONFIG !== 'undefined' && CONFIG && typeof CONFIG.API_BASE_URL === 'string') {
        API_BASE_URL = CONFIG.API_BASE_URL;
        console.log("script.js: CONFIG.API_BASE_URL 加载成功: ", API_BASE_URL);
    } else {
        console.error("script.js: 错误 - CONFIG 对象或 CONFIG.API_BASE_URL 未定义或类型不正确！请检查 config.js 是否正确加载并在 script.js 之前。");
        if (messageArea) messageArea.textContent = "错误：前端配置加载失败，无法连接服务器。";
        // 如果API_BASE_URL无效，后续的API调用会失败，可以提前返回或禁用按钮
        if (dealButton) dealButton.disabled = true;
        if (submitButton) submitButton.disabled = true;
        return; // 阻止后续代码执行，因为API URL无效
    }

    let CARD_IMAGE_PATH = './assets/images/'; // 默认值
    if (typeof CONFIG !== 'undefined' && CONFIG && typeof CONFIG.CARD_IMAGE_PATH === 'string') {
        CARD_IMAGE_PATH = CONFIG.CARD_IMAGE_PATH;
        console.log("script.js: CONFIG.CARD_IMAGE_PATH 加载成功: ", CARD_IMAGE_PATH);
    } else {
        console.warn("script.js: 警告 - CONFIG.CARD_IMAGE_PATH 未定义或类型不正确，使用默认值: ", CARD_IMAGE_PATH);
    }


    let currentHand = [];
    let arrangedCards = { head: [], middle: [], tail: [] };
    let draggedCard = null;
    let selectedCardForPlacement = null;

    // --- 卡牌图片路径转换 ---
    function getCardImagePath(card) {
        if (!card || typeof card.suit !== 'string' || typeof card.rank !== 'string') {
            console.error("script.js: getCardImagePath - 无效的card对象:", card);
            return ''; // 返回空路径或默认图片路径
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

    // --- 渲染卡牌 (简化版，确保函数存在) ---
    function renderCard(cardData, isDraggable = true) {
        // console.log("script.js: renderCard 调用, cardData:", cardData);
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        if (!cardData || typeof cardData.id === 'undefined') { // 确保cardData 和 id 存在
            console.error("script.js: renderCard - cardData 或 cardData.id 未定义:", cardData);
            cardDiv.textContent = "错误牌";
            return cardDiv;
        }
        cardDiv.dataset.id = cardData.id;
        cardDiv.dataset.suit = cardData.suit;
        cardDiv.dataset.rank = cardData.rank;
        const imagePath = getCardImagePath(cardData);
        cardDiv.style.backgroundImage = `url('${imagePath}')`;
        cardDiv.textContent = `${cardData.rank}${cardData.suit.charAt(0).toUpperCase()}`;
        cardDiv.style.color = 'transparent';
        // ... (拖拽和点击事件绑定逻辑，暂时保持不变或简化)
        return cardDiv;
    }

    // --- 显示手牌 (简化版) ---
    function displayHand() {
        console.log("script.js: displayHand 调用。");
        if (!playerHandDiv) return;
        playerHandDiv.innerHTML = '';
        // ... (渲染逻辑，暂时保持不变或简化)
        updateButtonStates();
    }

    // --- 更新按钮状态 (简化版) ---
    function updateButtonStates() {
        console.log("script.js: updateButtonStates 调用。");
        // ... (逻辑，暂时保持不变或简化)
    }


    // --- API 调用封装 ---
    async function fetchFromServer(endpoint, options = {}) {
        const fullUrl = `${API_BASE_URL}/${endpoint}`;
        console.log(`script.js: fetchFromServer 开始请求: ${fullUrl}`, "选项:", options);
        if (messageArea) messageArea.textContent = `正在请求 ${fullUrl}...`;

        try {
            const response = await fetch(fullUrl, options);
            console.log(`script.js: fetchFromServer - 收到响应对象 for ${fullUrl}:`, response);

            if (!response.ok) {
                let errorText = `HTTP error! Status: ${response.status} for ${fullUrl}`;
                try {
                    // 尝试读取错误响应体，即使它不是JSON
                    const text = await response.text();
                    errorText += ` - Response body: ${text.substring(0, 200)}`; // 只显示前200字符
                } catch (e) {
                    // 读取响应体也可能失败
                }
                console.error("script.js: fetchFromServer - HTTP 错误:", errorText);
                throw new Error(errorText);
            }

            // 尝试解析JSON
            let data;
            try {
                data = await response.json();
                console.log(`script.js: fetchFromServer - JSON 解析成功 for ${fullUrl}:`, data);
            } catch (jsonError) {
                console.error(`script.js: fetchFromServer - JSON 解析错误 for ${fullUrl}:`, jsonError);
                // 尝试读取原始文本以帮助调试
                let rawText = "无法读取原始响应文本";
                try {
                    // 需要重新clone响应对象才能再次读取body，或者一开始就读取为text
                    // 为了简单，这里假设如果json解析失败，可能是因为内容不是json
                    const tempResponseForText = await fetch(fullUrl, options); // 再次请求以获取文本
                    rawText = await tempResponseForText.text();
                    console.error(`script.js: fetchFromServer - 原始响应文本 (可能非JSON) for ${fullUrl}: ${rawText.substring(0, 500)}`);
                } catch (textReadError) {
                    console.error("script.js: fetchFromServer - 读取原始响应文本也失败:", textReadError);
                }
                throw new Error(`JSON parsing error. Original text might be: ${rawText.substring(0,200)}...`);
            }
            
            if (messageArea) messageArea.textContent = data.message || "操作成功！";
            return data;

        } catch (error) {
            console.error(`script.js: fetchFromServer - 请求 ${fullUrl} 失败:`, error);
            if (messageArea) messageArea.textContent = `错误: ${error.message}`;
            // 不在这里返回null，而是让错误冒泡，调用者可以用自己的try-catch处理
            throw error; // 重新抛出错误，让调用者处理
        }
    }

    // --- 事件监听器绑定 ---
    if (dealButton) {
        dealButton.addEventListener('click', async () => {
            console.log("script.js: 发牌按钮被点击！");
            dealButton.disabled = true;
            if (messageArea) messageArea.textContent = '正在发牌...';

            try {
                console.log("script.js: 准备调用 fetchFromServer for deal_cards.php");
                const data = await fetchFromServer('deal_cards.php'); // endpoint 不带前导 /
                console.log("script.js: deal_cards.php 调用完成，返回数据:", data);

                if (data && data.success && data.hand) {
                    currentHand = data.hand.map((card, index) => ({ ...card, id: `card-${Date.now()}-${index}` }));
                    // resetGame(false); // 暂时注释，简化
                    displayHand();
                    if (messageArea) messageArea.textContent = "已发牌，请摆牌。";
                } else {
                    const errorMsg = (data && data.message) ? data.message : "发牌响应格式不正确或操作失败。";
                    console.error("script.js: 发牌逻辑问题 -", errorMsg, "完整data:", data);
                    if (messageArea) messageArea.textContent = '发牌失败: ' + errorMsg;
                }
            } catch (error) {
                // fetchFromServer 内部已经打印了错误，这里可以只更新UI
                console.error("script.js: 发牌按钮点击处理中捕获到错误:", error);
                // messageArea 的更新已在 fetchFromServer 的 catch 中处理
            } finally {
                dealButton.disabled = false; // 无论成功失败都恢复按钮
                updateButtonStates(); // 确保按钮状态更新
            }
        });
        console.log("script.js: 发牌按钮事件监听器已绑定。");
    } else {
        console.error("script.js: 错误 - dealButton 未找到，无法绑定事件监听器！");
    }

    if (submitButton) {
        // submitButton.addEventListener('click', async () => { ... }); // 暂时保持不变或简化
        console.log("script.js: 提交按钮事件监听器已绑定（如果代码未注释）。");
    }

    if (resetButton) {
        // resetButton.addEventListener('click', () => resetGame(true)); // 暂时保持不变或简化
        console.log("script.js: 重置按钮事件监听器已绑定（如果代码未注释）。");
    }

    // 初始化
    updateButtonStates();
    console.log("script.js: 初始化完成。");
});

console.log("script.js: 文件加载结束。");
