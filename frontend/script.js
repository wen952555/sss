// frontend/script.js (NEW FILENAME RULE Version)
console.log("script.js: NEW_FILENAME_DEBUG - 文件开始加载。");

document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js: NEW_FILENAME_DEBUG - DOMContentLoaded 事件已触发。");

    const messageArea = document.getElementById('message-area');
    const dealButton = document.getElementById('dealButton');
    const playerHandDiv = document.getElementById('player-hand');

    if (!messageArea || !dealButton || !playerHandDiv) {
        console.error("script.js: NEW_FILENAME_FATAL - 关键DOM元素未找到。");
        if(messageArea) messageArea.textContent = "页面初始化错误！"; return;
    }
    messageArea.textContent = "请点击“发牌”。";

    if (typeof CONFIG === 'undefined' || !CONFIG ||
        typeof CONFIG.API_BASE_URL !== 'string' || !CONFIG.API_BASE_URL.trim() ||
        typeof CONFIG.IMAGE_SERVER_BASE_URL !== 'string' || !CONFIG.IMAGE_SERVER_BASE_URL.trim() ) {
        console.error("script.js: NEW_FILENAME_FATAL - CONFIG对象或其关键URL无效。", CONFIG);
        messageArea.textContent = "前端配置错误！"; dealButton.disabled = true; return;
    }
    const API_BASE_URL = CONFIG.API_BASE_URL;
    const IMAGE_SERVER_BASE_URL = CONFIG.IMAGE_SERVER_BASE_URL;
    console.log("script.js: NEW_FILENAME_DEBUG - 配置: API_URL=", API_BASE_URL, "IMAGE_URL=", IMAGE_SERVER_BASE_URL);

    let currentHand = [];

    // --- 【关键修改】卡牌图片路径转换 (根据你的新文件名规则) ---
    function getCardImagePath(card) {
        if (!card || typeof card.suit !== 'string' || typeof card.rank !== 'string') {
            console.warn("script.js: NEW_FILENAME_DEBUG - getCardImagePath - 收到无效的card对象:", card);
            return IMAGE_SERVER_BASE_URL + "placeholder_error.png"; // 假设你有这个占位图
        }

        let rankName;
        const inputRank = String(card.rank).toLowerCase(); // 后端牌点统一转小写处理
        switch (inputRank) {
            case 'a': rankName = 'ace'; break;
            case 'k': rankName = 'king'; break;
            case 'q': rankName = 'queen'; break;
            case 'j': rankName = 'jack'; break;
            case 't': rankName = '10'; break; // 'T' 转换为 "10"
            default: rankName = inputRank; // '2' through '9'
        }

        let suitName;
        const inputSuit = String(card.suit).toUpperCase(); // 后端花色统一转大写处理 (S, H, D, C)
        switch (inputSuit) {
            case 'S': suitName = 'spades'; break;
            case 'H': suitName = 'hearts'; break;
            case 'D': suitName = 'diamonds'; break;
            case 'C': suitName = 'clubs'; break;
            default:
                console.warn("script.js: NEW_FILENAME_DEBUG - getCardImagePath - 未知花色:", inputSuit);
                return IMAGE_SERVER_BASE_URL + "placeholder_error.png";
        }

        // 拼接文件名： 牌面小写英文全称_of_花色小写英文全称.png
        const imageName = `${rankName}_of_${suitName}.png`;
        const finalPath = `${IMAGE_SERVER_BASE_URL}${imageName}`;

        console.log(`script.js: NEW_FILENAME_DEBUG - Card: ${card.suit}${card.rank} -> RankName: ${rankName}, SuitName: ${suitName} -> ImageName: ${imageName} -> FullPath: ${finalPath}`);
        return finalPath;
    }

    function renderCardElement(cardData) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        if (!cardData || !cardData.suit || !cardData.rank) {
            cardDiv.textContent = "ERR"; cardDiv.style.backgroundColor = "red"; return cardDiv;
        }
        cardDiv.dataset.suit = cardData.suit; cardDiv.dataset.rank = cardData.rank;

        const imagePath = getCardImagePath(cardData);
        cardDiv.style.backgroundImage = `url('${imagePath}')`;

        const cardText = `${cardData.rank.toUpperCase()}${cardData.suit.toUpperCase().charAt(0)}`;
        cardDiv.textContent = cardText;
        cardDiv.style.color = 'transparent';

        const imgTest = new Image();
        imgTest.src = imagePath;
        imgTest.onload = () => {
            console.log(`script.js: NEW_FILENAME_SUCCESS - Img loaded: ${imagePath}`);
        };
        imgTest.onerror = () => {
            console.warn(`script.js: NEW_FILENAME_FAIL - Img fail: ${imagePath}. Showing text: ${cardText}`);
            cardDiv.style.backgroundImage = 'none';
            cardDiv.style.color = 'black';
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
    console.log("script.js: NEW_FILENAME_DEBUG - 初始化完成。");
});
console.log("script.js: NEW_FILENAME_DEBUG - 文件加载结束。");
