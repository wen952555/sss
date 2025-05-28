// frontend/script.js (Using PNG Images)
console.log("script.js: PNG_DEBUG - 文件开始加载。");

document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js: PNG_DEBUG - DOMContentLoaded 事件已触发。");

    const messageArea = document.getElementById('message-area');
    const dealButton = document.getElementById('dealButton');
    const playerHandDiv = document.getElementById('player-hand');

    if (!messageArea || !dealButton || !playerHandDiv) {
        console.error("script.js: PNG_FATAL - 关键DOM元素未找到。");
        if(messageArea) messageArea.textContent = "页面初始化错误！"; return;
    }
    messageArea.textContent = "请点击“发牌”。";

    if (typeof CONFIG === 'undefined' || !CONFIG || typeof CONFIG.API_BASE_URL !== 'string' || !CONFIG.API_BASE_URL.trim()) {
        console.error("script.js: PNG_FATAL - CONFIG或API_BASE_URL无效。");
        messageArea.textContent = "前端配置错误！"; dealButton.disabled = true; return;
    }
    const API_BASE_URL = CONFIG.API_BASE_URL;
    // 使用上一轮确认有效的绝对路径方式
    const ABSOLUTE_CARD_IMAGE_BASE_PATH = '/assets/images/';
    console.log("script.js: PNG_DEBUG - 配置: API_URL=", API_BASE_URL, "IMAGE_PATH=", ABSOLUTE_CARD_IMAGE_BASE_PATH);

    let currentHand = [];

    // --- 卡牌图片路径转换 (修改为 .png) ---
    function getCardImagePath(card) {
        if (!card || typeof card.suit !== 'string' || typeof card.rank !== 'string') {
            console.warn("script.js: PNG_DEBUG - getCardImagePath - 收到无效的card对象:", card);
            return ABSOLUTE_CARD_IMAGE_BASE_PATH + "placeholder_error.png"; // 占位符也用png
        }
        const suitName = String(card.suit).toLowerCase();
        let rankName = String(card.rank).toLowerCase();

        if (rankName === 'a') rankName = 'ace';
        else if (rankName === 'k') rankName = 'king';
        else if (rankName === 'q') rankName = 'queen';
        else if (rankName === 'j') rankName = 'jack';
        else if (rankName === 't') rankName = '10';

        const finalPath = `${ABSOLUTE_CARD_IMAGE_BASE_PATH}${suitName}_${rankName}.png`; // 【关键修改：.svg -> .png】
        // console.log(`script.js: PNG_DEBUG - getCardImagePath for ${card.suit}${card.rank} -> ${finalPath}`);
        return finalPath;
    }

    // --- 渲染单张卡牌到HTML元素 (onError中增加对绝对路径的强调) ---
    function renderCardElement(cardData) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        if (cardData && cardData.suit && cardData.rank) {
            cardDiv.dataset.suit = cardData.suit;
            cardDiv.dataset.rank = cardData.rank;
        } else {
            cardDiv.textContent = "ERR"; cardDiv.style.backgroundColor = "red"; return cardDiv;
        }

        const imagePath = getCardImagePath(cardData);
        console.log(`script.js: PNG_DEBUG - renderCardElement - 牌 ${cardData.suit}${cardData.rank} - 尝试路径: url('${imagePath}')`);

        cardDiv.style.backgroundImage = `url('${imagePath}')`;

        const cardText = `${cardData.rank.toUpperCase()}${cardData.suit.toUpperCase().charAt(0)}`;
        cardDiv.textContent = cardText;
        cardDiv.style.color = 'transparent';

        const imgTest = new Image();
        imgTest.src = imagePath;
        imgTest.onload = function() {
            console.log(`script.js: PNG_DEBUG - 图片加载成功 (onload): ${imagePath} for card ${cardText}`);
        };
        imgTest.onerror = function() {
            console.warn(`script.js: PNG_WARNING - 图片加载失败 (onerror触发) 使用路径: ${imagePath} (对应URL: ${new URL(imagePath, window.location.origin).href}) for card ${cardText}. 将显示后备文本.`);
            cardDiv.style.backgroundImage = 'none';
            cardDiv.style.color = 'black';
        };
        return cardDiv;
    }

    // --- displayHand 和 发牌按钮事件处理 (保持不变) ---
    function displayHand() {
        console.log("script.js: PNG_DEBUG - displayHand() 被调用.");
        playerHandDiv.innerHTML = '';
        if (currentHand && Array.isArray(currentHand) && currentHand.length > 0) {
            currentHand.forEach(card => playerHandDiv.appendChild(renderCardElement(card)));
            console.log("script.js: PNG_DEBUG - displayHand - 已尝试渲染", currentHand.length, "张牌。");
            if (messageArea) messageArea.textContent = "手牌已在下方显示！";
        } else {
            if (messageArea) messageArea.textContent = "未能获取到有效手牌数据来显示。";
        }
    }

    dealButton.addEventListener('click', async () => {
        console.log("script.js: PNG_DEBUG - 发牌按钮被点击！");
        dealButton.disabled = true;
        if (messageArea) messageArea.textContent = "正在获取手牌...";
        const endpoint = 'deal_cards.php';
        const fullApiUrl = `${API_BASE_URL}/${endpoint}`;
        try {
            const response = await fetch(fullApiUrl);
            if (!response.ok) throw new Error(`API请求失败! 状态: ${response.status}`);
            const data = await response.json();
            if (data && data.success === true && data.hand && Array.isArray(data.hand)) {
                if (messageArea) messageArea.textContent = data.message || "手牌数据已获取...";
                currentHand = data.hand.map((card, index) => ({ ...card, id: card.id || `card-${Date.now()}-${index}` }));
                displayHand();
            } else {
                const errorMsg = (data && data.message) ? data.message : "手牌数据格式不正确。";
                console.error("script.js: PNG_ERROR - ", errorMsg, data);
                if (messageArea) messageArea.textContent = errorMsg; currentHand = []; displayHand();
            }
        } catch (error) {
            console.error("script.js: PNG_ERROR - 发牌操作错误:", error);
            if (messageArea) messageArea.textContent = `发牌请求失败: ${String(error.message).substring(0,100)}`;
            currentHand = []; displayHand();
        } finally {
            dealButton.disabled = false;
            console.log("script.js: PNG_DEBUG - 发牌事件处理结束。");
        }
    });
    console.log("script.js: PNG_DEBUG - 发牌按钮事件监听器已绑定。");

    if (messageArea) messageArea.textContent = "页面初始化完成 (PNG Version)。";
    console.log("script.js: PNG_DEBUG - 脚本初始化逻辑执行完毕。");
});
console.log("script.js: PNG_DEBUG - 文件加载结束。");
