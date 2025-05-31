// frontend/js/ui.js

/**
 * 显示错误消息
 * @param {HTMLElement|string} elementOrId DOM元素或其ID
 * @param {string} message 错误消息
 */
function displayError(elementOrId, message) {
    const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (element) {
        element.textContent = message;
        element.style.display = message ? 'block' : 'none';
    }
}

/**
 * 显示通用消息
 * @param {HTMLElement|string} elementOrId
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showMessage(elementOrId, message, type = 'info') {
    const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (element) {
        element.textContent = message;
        element.className = `message-area ${type}`;
        element.style.display = message ? 'block' : 'none';
    }
}


/**
 * 创建卡牌的DOM元素
 * @param {object} cardData - { rank, suit, imageName, displayRank, displaySuit, string }
 * @param {boolean} isDraggable - 卡牌是否可拖拽
 * @returns {HTMLDivElement} 卡牌的div元素
 */
function createCardElement(cardData, isDraggable = true) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    if (isDraggable) {
        cardDiv.draggable = true;
    }
    // cardData.string 通常是 "AS", "KH" 等，后端 Card->toArray() 中应该提供
    // 如果后端没有提供 string，则用 rank 和 suit 拼接，但要注意 "10" 的情况
    let cardIdentifier = cardData.string;
    if (!cardIdentifier) {
        let rankForId = cardData.rank === '10' ? 'T' : cardData.rank.charAt(0); // 简化10为T，或者保持10
        cardIdentifier = `${rankForId}${cardData.suit.charAt(0)}`.toUpperCase();
        // 或者更可靠的是 cardData.rank.toUpperCase() + cardData.suit.toUpperCase();
        // 但 cardData.string 是最好的，如果后端能提供的话
    }
    // 确保 dataset.cardId 是一个有效的、唯一的字符串
    cardDiv.dataset.cardId = cardIdentifier || `${cardData.rank}_of_${cardData.suit}`;


    const img = document.createElement('img');
    // CARD_IMAGE_PATH 来自 config.js，确保 config.js 在 ui.js 之前加载
    // 并且 cardData.imageName 由后端提供，格式如 "ace_of_spades.svg"

    let imageName = cardData.imageName; // 优先使用后端提供的 imageName
    if (!imageName) {
        // 如果后端没提供 imageName，尝试根据 rank 和 suit 生成
        // 注意：这需要你的图片文件名与这个生成规则完全匹配
        const rankLower = cardData.rank.toLowerCase();
        const suitLower = cardData.suit.toLowerCase(); // 假设后端suit是 "hearts", "spades"
                                                     // 如果后端suit是 "H", "S"，需要转换
        const suitFullName = {
            'H': 'hearts', 'S': 'spades', 'D': 'diamonds', 'C': 'clubs',
            'HEARTS': 'hearts', 'SPADES': 'spades', 'DIAMONDS': 'diamonds', 'CLUBS': 'clubs'
        }[suitLower.toUpperCase()] || suitLower; // 容错处理

        imageName = `${rankLower}_of_${suitFullName}.svg`;
    }

    img.src = `${CARD_IMAGE_PATH}${imageName}`;

    img.alt = cardData.displayRank && cardData.displaySuit ? `${cardData.displayRank}${cardData.displaySuit}` : `${cardData.rank}${cardData.suit}`;
    img.title = img.alt;
    cardDiv.appendChild(img);
    return cardDiv;
}

function clearElement(elementOrId) {
    const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if(element) element.innerHTML = '';
}

function showLoading(elementOrId, show = true, message = '加载中...') {
    const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (element) {
        if (show) {
            element.textContent = message;
            element.style.display = 'block';
        } else {
            // 如果只是隐藏加载，最好不要清空可能存在的其他错误或消息
            // 除非这个元素专门用于加载提示
            if (element.textContent === message) { // 只在内容是加载信息时清空
                element.textContent = '';
            }
            element.style.display = 'none';
        }
    }
}

/**
 * 在页面跳转前保存一些临时状态到 sessionStorage
 * @param {string} key
 * @param {any} value
 */
function setTempState(key, value) {
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error("Error saving to sessionStorage:", e);
    }
}

/**
 * 从 sessionStorage 获取临时状态
 * @param {string} key
 * @returns {any|null}
 */
function getTempState(key) {
    try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        console.error("Error reading from sessionStorage:", e);
        return null;
    }
}

/**
 * 清除临时状态
 * @param {string} key
 */
function clearTempState(key) { // *** 注意这里的空格：function 和 clearTempState 之间 ***
    sessionStorage.removeItem(key);
}
