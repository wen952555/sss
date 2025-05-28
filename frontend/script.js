// frontend/script.js
console.log("script.js: DEBUG - 文件开始加载。");

document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js: DEBUG - DOMContentLoaded 事件已触发。");

    // --- DOM 元素获取 ---
    const messageArea = document.getElementById('message-area');
    const dealButton = document.getElementById('dealButton');
    const playerHandDiv = document.getElementById('player-hand');

    if (!messageArea || !dealButton || !playerHandDiv) {
        console.error("script.js: FATAL ERROR - 一个或多个必需的DOM元素未找到。请检查HTML的ID。");
        if (messageArea) messageArea.textContent = "页面初始化错误：关键元素缺失！";
        alert("页面初始化错误：关键元素缺失！请检查HTML。");
        return;
    }
    console.log("script.js: DEBUG - 必需的DOM元素已获取。");
    messageArea.textContent = "请点击“发牌”按钮。";

    // --- 配置获取 ---
    if (typeof CONFIG === 'undefined' || CONFIG === null || typeof CONFIG.API_BASE_URL !== 'string' || CONFIG.API_BASE_URL.trim() === '') {
        console.error("script.js: FATAL ERROR - CONFIG对象或API_BASE_URL无效。请检查config.js。");
        messageArea.textContent = "前端配置错误：API信息无效！";
        alert("前端配置错误：API信息无效！请检查config.js。");
        dealButton.disabled = true;
        return;
    }
    const API_BASE_URL = CONFIG.API_BASE_URL;
    const CARD_IMAGE_PATH = (typeof CONFIG.CARD_IMAGE_PATH === 'string' && CONFIG.CARD_IMAGE_PATH.trim() !== '') ? CONFIG.CARD_IMAGE_PATH : './assets/images/';
    console.log("script.js: DEBUG - 配置加载: API_BASE_URL=", API_BASE_URL, "CARD_IMAGE_PATH=", CARD_IMAGE_PATH);

    let currentHand = [];

    // --- 卡牌图片路径转换 ---
    function getCardImagePath(card) {
        if (!card || typeof card.suit !== 'string' || typeof card.rank !== 'string') {
            console.warn("script.js: getCardImagePath - 收到无效的card对象:", card);
            return CARD_IMAGE_PATH + "placeholder_error.svg"; // 返回一个明确的错误占位符
        }
        const suitName = String(card.suit).toLowerCase(); // 确保是字符串并转小写
        let rankName = String(card.rank).toLowerCase();   // 确保是字符串并转小写

        if (rankName === 'a') rankName = 'ace';
        else if (rankName === 'k') rankName = 'king';
        else if (rankName === 'q') rankName = 'queen';
        else if (rankName === 'j') rankName = 'jack';
        else if (rankName === 't') rankName = '10';
        // 对于数字 2-9，保持它们的原样

        const finalPath = `${CARD_IMAGE_PATH}${suitName}_${rankName}.svg`;
        // console.log(`script.js: DEBUG - getCardImagePath for ${card.suit}${card.rank} -> ${finalPath}`); // 可选的详细日志
        return finalPath;
    }

    // --- 渲染单张卡牌到HTML元素 ---
    function renderCardElement(cardData) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card'); // 应用CSS样式

        // 为调试目的，也为卡牌元素添加数据属性
        if (cardData && cardData.suit && cardData.rank) {
            cardDiv.dataset.suit = cardData.suit;
            cardDiv.dataset.rank = cardData.rank;
            cardDiv.dataset.cardKey = `${cardData.suit}-${cardData.rank}`; // 组合键
        } else {
            console.error("script.js: renderCardElement - 收到无效的 cardData:", cardData);
            cardDiv.textContent = "ERR"; // 显示错误文本
            cardDiv.style.backgroundColor = "red"; // 标记错误卡牌
            return cardDiv;
        }

        const imagePath = getCardImagePath(cardData);
        console.log(`script.js: DEBUG - renderCardElement - 尝试为牌 ${cardData.suit}${cardData.rank} 设置背景图: url('${imagePath}')`);

        // 设置背景图片
        cardDiv.style.backgroundImage = `url('${imagePath}')`;

        // 设置后备文本 (如果图片加载失败会尝试显示这个)
        const cardText = `${cardData.rank.toUpperCase()}${cardData.suit.toUpperCase().charAt(0)}`;
        cardDiv.textContent = cardText;
        cardDiv.style.color = 'transparent'; // 默认将文本设为透明，优先显示背景图

        // 使用一个临时的Image对象来检测图片是否加载成功
        // 这有助于我们知道是图片路径问题还是CSS显示问题
        const imgTest = new Image();
        imgTest.src = imagePath;

        imgTest.onload = function() {
            // 图片成功加载 (或者至少浏览器认为它可以获取这个资源)
            // 背景图片应该已经通过 cardDiv.style.backgroundImage 设置并显示了
            console.log(`script.js: DEBUG - 图片似乎已成功加载 (onload触发): ${imagePath} for card ${cardText}`);
            // 如果图片是透明的或者非常小，可能还是看不到，但路径是对的
        };

        imgTest.onerror = function() {
            // 图片加载失败 (路径错误、文件损坏、网络问题等)
            console.warn(`script.js: WARNING - 图片加载失败 (onerror触发): ${imagePath} for card ${cardText}. 将显示后备文本.`);
            cardDiv.style.backgroundImage = 'none'; // 清除失败的背景图
            cardDiv.style.color = 'black';      // 使后备文本可见
        };

        // 【TODO】在这里可以为卡牌添加点击或拖拽事件监听器
        // cardDiv.addEventListener('click', () => { console.log('Card clicked:', cardData); });

        return cardDiv;
    }

    // --- 显示手牌到页面 ---
    function displayHand() {
        console.log("script.js: DEBUG - displayHand() 被调用. currentHand (前5张):", currentHand.slice(0,5));
        if (!playerHandDiv) {
            console.error("script.js: FATAL ERROR - displayHand - playerHandDiv 未找到!");
            return;
        }
        playerHandDiv.innerHTML = ''; // 清空旧的手牌

        if (currentHand && Array.isArray(currentHand) && currentHand.length > 0) {
            currentHand.forEach((card, index) => {
                console.log(`script.js: DEBUG - displayHand - 正在渲染第 ${index + 1} 张牌:`, card);
                const cardElement = renderCardElement(card);
                playerHandDiv.appendChild(cardElement);
            });
            console.log("script.js: DEBUG - displayHand - 已尝试渲染", currentHand.length, "张牌。");
            if (messageArea) messageArea.textContent = "手牌已在下方显示！";
        } else {
            console.warn("script.js: DEBUG - displayHand - currentHand 为空或无效，不渲染牌。");
            if (messageArea) messageArea.textContent = "未能获取到有效手牌数据来显示。";
        }
    }

    // --- 发牌按钮的点击事件处理 ---
    dealButton.addEventListener('click', async () => {
        console.log("script.js: DEBUG - 发牌按钮被点击！");
        dealButton.disabled = true;
        if (messageArea) messageArea.textContent = "正在从服务器获取手牌...";

        const endpoint = 'deal_cards.php'; // 后端API的发牌端点
        const fullApiUrl = `${API_BASE_URL}/${endpoint}`;
        console.log(`script.js: DEBUG - 准备请求API: ${fullApiUrl}`);

        try {
            const response = await fetch(fullApiUrl);
            console.log(`script.js: DEBUG - 收到API响应对象:`, response);

            if (!response.ok) {
                let errorDetail = `(状态码: ${response.status})`;
                try { errorDetail = await response.text(); } catch (e) {}
                const errorMsg = `API请求失败! ${errorDetail.substring(0,150)}`;
                console.error("script.js: ERROR - ", errorMsg, "完整响应:", response);
                if (messageArea) messageArea.textContent = errorMsg;
                currentHand = []; displayHand();
                throw new Error(errorMsg);
            }

            const data = await response.json();
            console.log("script.js: DEBUG - API响应JSON解析成功:", data);

            if (data && data.success === true && data.hand && Array.isArray(data.hand)) {
                if (messageArea) messageArea.textContent = data.message || "手牌数据已获取，正在处理...";
                currentHand = data.hand.map((card, index) => ({
                    ...card,
                    id: card.id || `card-${Date.now()}-${index}` // 为每张牌确保有唯一ID
                }));
                console.log("script.js: DEBUG - currentHand 已更新，准备显示。");
                displayHand(); // 【调用函数显示手牌】
            } else {
                const errorMsg = (data && data.message) ? data.message : "从API获取的手牌数据格式不正确或操作失败。";
                console.error("script.js: ERROR - ", errorMsg, "完整数据:", data);
                if (messageArea) messageArea.textContent = errorMsg;
                currentHand = []; displayHand();
            }
        } catch (error) {
            console.error("script.js: ERROR - 发牌操作中捕获到顶层错误:", error);
            if (messageArea && !messageArea.textContent.includes("API请求失败") && !messageArea.textContent.includes("手牌数据格式不正确")) {
                 if (messageArea) messageArea.textContent = `发牌请求意外失败: ${String(error.message).substring(0,100)}`;
            }
            currentHand = []; displayHand();
        } finally {
            dealButton.disabled = false;
            console.log("script.js: DEBUG - 发牌按钮事件处理结束 (finally块)。");
        }
    });
    console.log("script.js: DEBUG - 发牌按钮事件监听器已绑定。");

    if (messageArea) messageArea.textContent = "页面和脚本初始化完成。请点击“发牌”按钮。";
    console.log("script.js: DEBUG - 脚本初始化逻辑执行完毕。");
});

console.log("script.js: DEBUG - 文件加载结束。");
