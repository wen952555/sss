// frontend/script.js
console.log("script.js: DEBUG - 文件开始加载。");

document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js: DEBUG - DOMContentLoaded 事件已触发。");

    const messageArea = document.getElementById('message-area');
    const dealButton = document.getElementById('dealButton');
    const playerHandDiv = document.getElementById('player-hand');

    if (!messageArea || !dealButton || !playerHandDiv) {
        console.error("script.js: FATAL ERROR - 一个或多个必需的DOM元素未找到。");
        if (messageArea) messageArea.textContent = "页面初始化错误：关键元素缺失！";
        return;
    }
    messageArea.textContent = "请点击“发牌”按钮。";

    if (typeof CONFIG === 'undefined' || !CONFIG || typeof CONFIG.API_BASE_URL !== 'string' || !CONFIG.API_BASE_URL.trim()) {
        console.error("script.js: FATAL ERROR - CONFIG对象或API_BASE_URL无效。");
        messageArea.textContent = "前端配置错误：API信息无效！";
        dealButton.disabled = true;
        return;
    }
    const API_BASE_URL = CONFIG.API_BASE_URL;

    // 【修改点1】: 定义一个明确的、从站点根开始的图片基础路径
    // 对于部署在 sss-8e3.pages.dev 根目录的项目，这个路径应该是正确的。
    // 如果你的项目实际部署在一个子路径下，例如 sss-8e3.pages.dev/mygame/
    // 那么这个路径需要是 '/mygame/assets/images/'
    const ABSOLUTE_CARD_IMAGE_BASE_PATH = '/assets/images/';
    console.log("script.js: DEBUG - 配置: API_URL=", API_BASE_URL, "ABSOLUTE_CARD_IMAGE_BASE_PATH=", ABSOLUTE_CARD_IMAGE_BASE_PATH);

    let currentHand = [];

    // --- 卡牌图片路径转换 ---
    function getCardImagePath(card) {
        if (!card || typeof card.suit !== 'string' || typeof card.rank !== 'string') {
            console.warn("script.js: getCardImagePath - 收到无效的card对象:", card);
            return ABSOLUTE_CARD_IMAGE_BASE_PATH + "placeholder_error.svg";
        }
        const suitName = String(card.suit).toLowerCase();
        let rankName = String(card.rank).toLowerCase();

        if (rankName === 'a') rankName = 'ace';
        else if (rankName === 'k') rankName = 'king';
        else if (rankName === 'q') rankName = 'queen';
        else if (rankName === 'j') rankName = 'jack';
        else if (rankName === 't') rankName = '10';

        const finalPath = `${ABSOLUTE_CARD_IMAGE_BASE_PATH}${suitName}_${rankName}.svg`;
        // console.log(`script.js: DEBUG - getCardImagePath for ${card.suit}${card.rank} -> ${finalPath}`);
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

        const imagePath = getCardImagePath(cardData); // 现在这个函数返回的是绝对路径
        console.log(`script.js: DEBUG - renderCardElement - 牌 ${cardData.suit}${cardData.rank} - 尝试路径: url('${imagePath}')`);

        cardDiv.style.backgroundImage = `url('${imagePath}')`;

        const cardText = `${cardData.rank.toUpperCase()}${cardData.suit.toUpperCase().charAt(0)}`;
        cardDiv.textContent = cardText;
        cardDiv.style.color = 'transparent';

        const imgTest = new Image();
        imgTest.src = imagePath;
        imgTest.onload = function() {
            console.log(`script.js: DEBUG - 图片加载成功 (onload): ${imagePath} for card ${cardText}`);
        };
        imgTest.onerror = function() {
            // 注意：这里的 imagePath 已经是绝对路径了 (例如 /assets/images/s_ace.svg)
            // 浏览器在请求时会自动加上当前域名 (https://sss-8e3.pages.dev)
            console.warn(`script.js: WARNING - 图片加载失败 (onerror触发) 使用路径: ${imagePath} (对应URL: ${new URL(imagePath, window.location.origin).href}) for card ${cardText}. 将显示后备文本.`);
            cardDiv.style.backgroundImage = 'none';
            cardDiv.style.color = 'black';
        };
        return cardDiv;
    }

    // --- displayHand 和 发牌按钮事件处理 (保持不变) ---
    function displayHand() {
        console.log("script.js: DEBUG - displayHand() 被调用.");
        playerHandDiv.innerHTML = '';
        if (currentHand && Array.isArray(currentHand) && currentHand.length > 0) {
            currentHand.forEach(card => playerHandDiv.appendChild(renderCardElement(card)));
            console.log("script.js: DEBUG - displayHand - 已尝试渲染", currentHand.length, "张牌。");
            if (messageArea) messageArea.textContent = "手牌已在下方显示！";
        } else {
            if (messageArea) messageArea.textContent = "未能获取到有效手牌数据来显示。";
        }
    }

    dealButton.addEventListener('click', async () => {
        console.log("script.js: DEBUG - 发牌按钮被点击！");
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
                console.error("script.js: ERROR - ", errorMsg, data);
                if (messageArea) messageArea.textContent = errorMsg; currentHand = []; displayHand();
            }
        } catch (error) {
            console.error("script.js: ERROR - 发牌操作错误:", error);
            if (messageArea) messageArea.textContent = `发牌请求失败: ${String(error.message).substring(0,100)}`;
            currentHand = []; displayHand();
        } finally {
            dealButton.disabled = false;
            console.log("script.js: DEBUG - 发牌事件处理结束。");
        }
    });
    console.log("script.js: DEBUG - 发牌按钮事件监听器已绑定。");

    if (messageArea) messageArea.textContent = "页面初始化完成。";
    console.log("script.js: DEBUG - 脚本初始化逻辑执行完毕。");
});
console.log("script.js: DEBUG - 文件加载结束。");
