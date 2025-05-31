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
        element.className = `message-area ${type}`; // 假设有CSS类 .message-area.success 等
        element.style.display = message ? 'block' : 'none';
    }
}


/**
 * 创建卡牌的DOM元素
 * @param {object} cardData - { rank, suit, imageName, displayRank, displaySuit }
 * @param {boolean} isDraggable - 卡牌是否可拖拽
 * @returns {HTMLDivElement} 卡牌的div元素
 */
function createCardElement(cardData, isDraggable = true) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    if (isDraggable) {
        cardDiv.draggable = true;
    }
    // 使用卡牌的唯一标识符，例如 "AS" (Ace of Spades) 或后端生成的ID
    // cardData.string 来源于 Card.php -> toArray() -> 'string'
    cardDiv.dataset.cardId = cardData.string || `${cardData.rank}_of_${cardData.suit}`; // 确保有唯一ID

    const img = document.createElement('img');
    // 从 config.js 获取路径
    img.src = `${CARD_IMAGE_PATH}${cardData.imageName || (cardData.string ? cardData.string.toLowerCase().replace(/^([a-z\d]+)([hsdc])$/, (match,p1,p2) => `${p1}_of_${suitLetterToName(p2)}.svg`) : `${cardData.rank.toLowerCase()}_of_${cardData.suit.toLowerCase()}.svg`)}`;
    // 辅助函数将 suit 字母转为全名
    function suitLetterToName(letter) {
        const map = { H: 'hearts', S: 'spades', D: 'diamonds', C: 'clubs'};
        return map[letter.toUpperCase()] || letter.toLowerCase();
    }

    img.alt = cardData.displayRank ? `${cardData.displayRank}${cardData.displaySuit}` : `${cardData.rank}${cardData.suit}`;
    img.title = img.alt;
    cardDiv.appendChild(img);
    return cardDiv;
}

// 更多UI辅助函数...
// 例如：清空元素内容，显示/隐藏加载指示器，渲染列表等
function clearElement(elementOrId) {
    const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if(element) element.innerHTML = '';
}

function showLoading(elementOrId, show = true) {
    // 简单的实现：可以添加一个 .loading 类或直接修改文本
    const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (element) {
        if (show) {
            element.textContent = '加载中...'; // 或者插入一个spinner元素
            element.style.display = 'block';
        } else {
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
    sessionStorage.setItem(key, JSON.stringify(value));
}

/**
 * 从 sessionStorage 获取临时状态
 * @param {string} key
 * @returns {any|null}
 */
function getTempState(key) {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : null;
}

/**
 * 清除临时状态
 * @param {string} key
 */
functionclearTempState(key) {
    sessionStorage.removeItem(key);
}
