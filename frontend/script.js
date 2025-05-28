// frontend/script.js (Corrected getCardImagePath based on your file naming)
console.log("script.js: FILENAME_FIX_DEBUG - 文件开始加载。");

document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js: FILENAME_FIX_DEBUG - DOMContentLoaded 事件已触发。");

    const messageArea = document.getElementById('message-area');
    const dealButton = document.getElementById('dealButton');
    const playerHandDiv = document.getElementById('player-hand');

    if (!messageArea || !dealButton || !playerHandDiv) {
        console.error("script.js: FILENAME_FIX_FATAL - 关键DOM元素未找到。");
        if(messageArea) messageArea.textContent = "页面初始化错误！"; return;
    }
    messageArea.textContent = "请点击“发牌”。";

    if (typeof CONFIG === 'undefined' || !CONFIG ||
        typeof CONFIG.API_BASE_URL !== 'string' || !CONFIG.API_BASE_URL.trim() ||
        typeof CONFIG.IMAGE_SERVER_BASE_URL !== 'string' || !CONFIG.IMAGE_SERVER_BASE_URL.trim() ) {
        console.error("script.js: FILENAME_FIX_FATAL - CONFIG对象或其关键URL无效。", CONFIG);
        messageArea.textContent = "前端配置错误！"; dealButton.disabled = true; return;
    }
    const API_BASE_URL = CONFIG.API_BASE_URL;
    const IMAGE_SERVER_BASE_URL = CONFIG.IMAGE_SERVER_BASE_URL; // 从CONFIG获取
    console.log("script.js: FILENAME_FIX_DEBUG - 配置: API_URL=", API_BASE_URL, "IMAGE_URL=", IMAGE_SERVER_BASE_URL);

    let currentHand = [];

    // --- 卡牌图片路径转换 (【关键修改】根据你的文件名规则) ---
    function getCardImagePath(card) {
        if (!card || typeof card.suit !== 'string' || typeof card.rank !== 'string') {
            console.warn("script.js: FILENAME_FIX_DEBUG - getCardImagePath - 收到无效的card对象:", card);
            return IMAGE_SERVER_BASE_URL + "placeholder_error.png";
        }

        const suit = String(card.suit).toLowerCase(); // 花色小写: c, d, h, s
        let rank = String(card.rank).toUpperCase();   // 【点数先转大写，因为后端返回的可能是小写t,j,q,k,a】

        // 后端返回的 rank 可能是 '2'...'9', 'T', 'J', 'Q', 'K', 'A'
        // 如果你的文件名直接用这些大写字母 (除了T可能需要确认)，就这样处理：
        // (不需要再映射为 ace, king, queen, jack, 10)

        // 假设文件名中的点数就是后端传来的 rank 值 (除了需要大写)
        // 例如后端传 {suit: 'C', rank: 'J'}, 文件名是 c_J.png
        // 例如后端传 {suit: 'D', rank: 'T'}, 文件名是 d_T.png
        // 例如后端传 {suit: 'S', rank: 'Q'}, 文件名是 s_Q.png
        // 例如后端传 {suit: 'H', rank: 'A'}, 文件名是 h_A.png
        // 例如后端传 {suit: 'C', rank: '6'}, 文件名是 c_6.png

        const finalPath = `${IMAGE_SERVER_BASE_URL}${suit}_${rank}.png`;
        console.log(`script.js: FILENAME_FIX_DEBUG - getCardImagePath for ${card.suit}${card.rank} -> Expected filename: ${suit}_${rank}.png -> Full path: ${finalPath}`);
        return finalPath;
    }

    // --- 渲染单张卡牌到HTML元素 (与上一版基本一致) ---
    function renderCardElement(cardData) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        if (!cardData || !cardData.suit || !cardData.rank) {
            cardDiv.textContent = "ERR"; cardDiv.style.backgroundColor = "red"; return cardDiv;
        }
        cardDiv.dataset.suit = cardData.suit; cardDiv.dataset.rank = cardData.rank;

        const imagePath = getCardImagePath(cardData); // 使用新的函数
        // console.log(`script.js: FILENAME_FIX_DEBUG - Render: ${cardData.suit}${cardData.rank} -> ${imagePath}`);
        cardDiv.style.backgroundImage = `url('${imagePath}')`;

        const cardText = `${cardData.rank.toUpperCase()}${cardData.suit.toUpperCase().charAt(0)}`;
        cardDiv.textContent = cardText;
        cardDiv.style.color = 'transparent';

        const imgTest = new Image();
        imgTest.src = imagePath;
        imgTest.onload = () => {
            console.log(`script.js: FILENAME_FIX_SUCCESS - Img loaded: ${imagePath}`);
        };
        imgTest.onerror = () => {
            console.warn(`script.js: FILENAME_FIX_FAIL - Img fail: ${imagePath}. Showing text: ${cardText}`);
            cardDiv.style.backgroundImage = 'none';
            cardDiv.style.color = 'black';
        };
        return cardDiv;
    }

    // --- displayHand 和 发牌按钮事件处理 (与上一版相同) ---
    function displayHand() {
        playerHandDiv.innerHTML = '';
        if (currentHand && Array.isArray(currentHand) && currentHand.length > 0) {
            currentHand.forEach(card => playerHandDiv.appendChild(renderCardElement(card)));
            if (messageArea) messageArea.textContent = "手牌已显示！";
        } else {
            if (messageArea) messageArea.textContent = "无有效手牌。";
        }
    }

    dealButton.addEventListener('click', async () => {
        dealButton.disabled = true;
        if (messageArea) messageArea.textContent = "正在获取手牌...";
        const fullApiUrl = `${API_BASE_URL}/deal_cards.php`;
        try {
            const response = await fetch(fullApiUrl);
            if (!response.ok) {
                let errDetail = `Status: ${response.status}`;
                try { errDetail = await response.text(); } catch(e){}
                throw new Error(`API请求失败! ${errDetail.substring(0,100)}`);
            }
            const data = await response.json();
            if (data && data.success === true && data.hand && Array.isArray(data.hand)) {
                if (messageArea) messageArea.textContent = data.message || "手牌获取成功...";
                currentHand = data.hand;
                displayHand();
            } else {
                const errorMsg = (data && data.message) ? data.message : "手牌数据格式不正确。";
                if (messageArea) messageArea.textContent = errorMsg; currentHand = []; displayHand();
            }
        } catch (error) {
            if (messageArea) messageArea.textContent = `请求错误: ${String(error.message).substring(0,100)}`;
            currentHand = []; displayHand();
        } finally {
            dealButton.disabled = false;
        }
    });
    console.log("script.js: FILENAME_FIX_DEBUG - 初始化完成。");
});
console.log("script.js: FILENAME_FIX_DEBUG - 文件加载结束。");
