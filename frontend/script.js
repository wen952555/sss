// frontend/script.js (Load PNGs from Correct Image Server)
console.log("script.js: IMG_SERVER_DEBUG - 文件开始加载。");

document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js: IMG_SERVER_DEBUG - DOMContentLoaded 事件已触发。");

    const messageArea = document.getElementById('message-area');
    const dealButton = document.getElementById('dealButton');
    const playerHandDiv = document.getElementById('player-hand');

    if (!messageArea || !dealButton || !playerHandDiv) {
        console.error("script.js: IMG_SERVER_FATAL - 关键DOM元素未找到。");
        if(messageArea) messageArea.textContent = "页面初始化错误！"; return;
    }
    messageArea.textContent = "请点击“发牌”。";

    if (typeof CONFIG === 'undefined' || !CONFIG || typeof CONFIG.API_BASE_URL !== 'string' || !CONFIG.API_BASE_URL.trim()) {
        console.error("script.js: IMG_SERVER_FATAL - CONFIG或API_BASE_URL无效。");
        messageArea.textContent = "前端配置错误！"; dealButton.disabled = true; return;
    }
    const API_BASE_URL = CONFIG.API_BASE_URL; // API请求的域名

    // 【关键修改】: 定义图片资源所在的【真实域名和基础路径】
    // 根据你的测试，图片实际在 'https://xxx.9525.ip-ddns.com/assets/images/'
    const ACTUAL_IMAGE_SERVER_BASE_PATH = 'https://xxx.9525.ip-ddns.com/assets/images/';
    console.log("script.js: IMG_SERVER_DEBUG - API_URL=", API_BASE_URL, "ACTUAL_IMAGE_SERVER_BASE_PATH=", ACTUAL_IMAGE_SERVER_BASE_PATH);

    let currentHand = [];

    // --- 卡牌图片路径转换 (使用实际图片服务器路径) ---
    function getCardImagePath(card) {
        if (!card || typeof card.suit !== 'string' || typeof card.rank !== 'string') {
            console.warn("script.js: IMG_SERVER_DEBUG - getCardImagePath - 收到无效的card对象:", card);
            // 如果有占位符图片在图片服务器上，也可以用，否则本地占位符可能因跨域也加载不了
            return ACTUAL_IMAGE_SERVER_BASE_PATH + "placeholder_error.png";
        }
        const suitName = String(card.suit).toLowerCase();
        let rankName = String(card.rank).toLowerCase();

        if (rankName === 'a') rankName = 'ace';
        else if (rankName === 'k') rankName = 'king';
        else if (rankName === 'q') rankName = 'queen';
        else if (rankName === 'j') rankName = 'jack';
        else if (rankName === 't') rankName = '10';

        const finalPath = `${ACTUAL_IMAGE_SERVER_BASE_PATH}${suitName}_${rankName}.png`;
        // console.log(`script.js: IMG_SERVER_DEBUG - getCardImagePath for ${card.suit}${card.rank} -> ${finalPath}`);
        return finalPath;
    }

    // --- 渲染单张卡牌到HTML元素 ---
    function renderCardElement(cardData) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card'); // 应用CSS，确保有宽高边框
        if (cardData && cardData.suit && cardData.rank) {
            cardDiv.dataset.suit = cardData.suit; cardDiv.dataset.rank = cardData.rank;
        } else {
            cardDiv.textContent = "ERR"; cardDiv.style.backgroundColor = "red"; return cardDiv;
        }

        const imagePath = getCardImagePath(cardData); // 现在这个函数返回的是【完整的绝对URL】
        console.log(`script.js: IMG_SERVER_DEBUG - renderCardElement - 牌 ${cardData.suit}${cardData.rank} - 尝试完整URL: url('${imagePath}')`);
        cardDiv.style.backgroundImage = `url('${imagePath}')`;

        const cardText = `${cardData.rank.toUpperCase()}${cardData.suit.toUpperCase().charAt(0)}`;
        cardDiv.textContent = cardText; cardDiv.style.color = 'transparent';

        const imgTest = new Image();
        // 【重要】对于跨域图片加载，imgTest.crossOrigin = "anonymous"; 可能需要，
        // 但对于简单的背景图显示，通常不是必需的，除非你要在canvas里操作图片。我们先不加。
        imgTest.src = imagePath;
        imgTest.onload = function() {
            console.log(`script.js: IMG_SERVER_SUCCESS - 图片加载成功: ${imgTest.src} for card ${cardText}`);
        };
        imgTest.onerror = function() {
            // 如果这里还失败，那么可能是 xxx.9525.ip-ddns.com 服务器对来自 sss-8e3.pages.dev 的图片请求有CORS限制
            // （虽然通常静态资源服务器不会默认开启这种限制，但 DDNS 服务或其后的服务器可能配置了）
            console.warn(`script.js: IMG_SERVER_FAIL - 图片加载失败: ${imgTest.src} for card ${cardText}. 将显示后备文本.`);
            console.warn(`script.js: IMG_SERVER_FAIL - 请确认 ${imgTest.src} 可以从你的前端域名 (${window.location.origin}) 正常访问，并且目标服务器允许跨域图片请求。`);
            cardDiv.style.backgroundImage = 'none'; cardDiv.style.color = 'black';
        };
        return cardDiv;
    }

    // --- displayHand 和 发牌按钮事件处理 (与之前基本一致) ---
    function displayHand() {
        console.log("script.js: IMG_SERVER_DEBUG - displayHand() 被调用. currentHand:", currentHand ? currentHand.length : 'null/undefined');
        playerHandDiv.innerHTML = '';
        if (currentHand && Array.isArray(currentHand) && currentHand.length > 0) {
            currentHand.forEach(card => playerHandDiv.appendChild(renderCardElement(card)));
            console.log("script.js: IMG_SERVER_DEBUG - displayHand - 已尝试渲染", currentHand.length, "张牌。");
            if (messageArea) messageArea.textContent = "手牌已在下方显示！";
        } else {
            console.warn("script.js: IMG_SERVER_DEBUG - displayHand - currentHand 为空或无效，不渲染牌。");
            if (messageArea) messageArea.textContent = "未能获取到有效手牌数据。";
        }
    }

    dealButton.addEventListener('click', async () => {
        console.log("script.js: IMG_SERVER_DEBUG - 发牌按钮被点击！");
        dealButton.disabled = true; if (messageArea) messageArea.textContent = "正在获取手牌...";
        const fullApiUrl = `${API_BASE_URL}/deal_cards.php`;
        try {
            const response = await fetch(fullApiUrl);
            if (!response.ok) throw new Error(`API请求失败! 状态: ${response.status}`);
            const data = await response.json();
            if (data && data.success === true && data.hand && Array.isArray(data.hand)) {
                if (messageArea) messageArea.textContent = data.message || "手牌获取成功...";
                currentHand = data.hand.map((card, index) => ({ ...card, id: card.id || `card-${Date.now()}-${index}` }));
                displayHand();
            } else {
                const errorMsg = (data && data.message) ? data.message : "手牌数据格式不正确。";
                console.error("script.js: IMG_SERVER_ERROR - ", errorMsg, data);
                if (messageArea) messageArea.textContent = errorMsg; currentHand = []; displayHand();
            }
        } catch (error) {
            console.error("script.js: IMG_SERVER_ERROR - 发牌操作错误:", error);
            if (messageArea) messageArea.textContent = `请求错误: ${String(error.message).substring(0,100)}`;
            currentHand = []; displayHand();
        } finally {
            dealButton.disabled = false;
            console.log("script.js: IMG_SERVER_DEBUG - 发牌事件处理结束。");
        }
    });
    console.log("script.js: IMG_SERVER_DEBUG - 初始化完成。");
});
console.log("script.js: IMG_SERVER_DEBUG - 文件加载结束。");
