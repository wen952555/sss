// frontend/script.js (FINAL_DEBUG Version)
console.log("script.js: FINAL_DEBUG - 文件开始加载。");

document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js: FINAL_DEBUG - DOMContentLoaded 事件已触发。");

    const messageArea = document.getElementById('message-area');
    const dealButton = document.getElementById('dealButton');
    const playerHandDiv = document.getElementById('player-hand');

    if (!messageArea || !dealButton || !playerHandDiv) {
        console.error("script.js: FINAL_FATAL - 关键DOM元素未找到。");
        if(messageArea) messageArea.textContent = "页面初始化错误！"; return;
    }
    messageArea.textContent = "请点击“发牌”。";

    if (typeof CONFIG === 'undefined' || !CONFIG ||
        typeof CONFIG.API_BASE_URL !== 'string' || !CONFIG.API_BASE_URL.trim() ||
        typeof CONFIG.IMAGE_SERVER_BASE_URL !== 'string' || !CONFIG.IMAGE_SERVER_BASE_URL.trim() ) {
        console.error("script.js: FINAL_FATAL - CONFIG对象或其关键URL无效。", CONFIG);
        messageArea.textContent = "前端配置错误！"; dealButton.disabled = true; return;
    }
    const API_BASE_URL = CONFIG.API_BASE_URL;
    const IMAGE_SERVER_BASE_URL = CONFIG.IMAGE_SERVER_BASE_URL; // 从CONFIG获取
    console.log("script.js: FINAL_DEBUG - 配置: API_URL=", API_BASE_URL, "IMAGE_URL=", IMAGE_SERVER_BASE_URL);

    let currentHand = [];

    function getCardImagePath(card) {
        if (!card || typeof card.suit !== 'string' || typeof card.rank !== 'string') {
            return IMAGE_SERVER_BASE_URL + "placeholder_error.png"; // 使用配置的图片基础路径
        }
        const suitName = String(card.suit).toLowerCase();
        let rankName = String(card.rank).toLowerCase();
        if (rankName === 'a') rankName = 'ace'; else if (rankName === 'k') rankName = 'king';
        else if (rankName === 'q') rankName = 'queen'; else if (rankName === 'j') rankName = 'jack';
        else if (rankName === 't') rankName = '10';
        return `${IMAGE_SERVER_BASE_URL}${suitName}_${rankName}.png`; // 使用配置的图片基础路径
    }

    function renderCardElement(cardData) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        if (!cardData || !cardData.suit || !cardData.rank) {
            cardDiv.textContent = "ERR"; cardDiv.style.backgroundColor = "red"; return cardDiv;
        }
        cardDiv.dataset.suit = cardData.suit; cardDiv.dataset.rank = cardData.rank;

        const imagePath = getCardImagePath(cardData);
        console.log(`script.js: FINAL_DEBUG - Render: ${cardData.suit}${cardData.rank} -> ${imagePath}`);
        cardDiv.style.backgroundImage = `url('${imagePath}')`;

        const cardText = `${cardData.rank.toUpperCase()}${cardData.suit.toUpperCase().charAt(0)}`;
        cardDiv.textContent = cardText;
        cardDiv.style.color = 'transparent'; // Hide text if image loads

        const imgTest = new Image();
        imgTest.src = imagePath;
        imgTest.onload = () => {
            console.log(`script.js: FINAL_SUCCESS - Img loaded: ${imagePath}`);
        };
        imgTest.onerror = () => {
            console.warn(`script.js: FINAL_FAIL - Img fail: ${imagePath}. Showing text: ${cardText}`);
            cardDiv.style.backgroundImage = 'none';
            cardDiv.style.color = 'black'; // Show text if image fails
        };
        return cardDiv;
    }

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
                currentHand = data.hand; // 后端现在应该会提供ID
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
    console.log("script.js: FINAL_DEBUG - 初始化完成。");
});
console.log("script.js: FINAL_DEBUG - 文件加载结束。");
