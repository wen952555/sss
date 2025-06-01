// frontend/js/ui.js
console.log("[UI.js] Loaded");

/**
 * 获取DOM元素，如果找不到则在控制台警告
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function getElementByIdSafe(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`[UI.js] Element with ID '${id}' not found in the DOM.`);
    }
    return element;
}

/**
 * 清空指定DOM元素的内容
 * @param {string} elementId
 */
function clearElementContent(elementId) {
    const element = getElementByIdSafe(elementId);
    if (element) {
        element.innerHTML = '';
    }
}

/**
 * 创建卡牌的HTML元素
 * @param {object} cardData - 由 createCard 生成的卡牌对象
 * @returns {HTMLDivElement|null}
 */
function createCardDOMElement(cardData) {
    if (!cardData || !cardData.imageName || !cardData.id) {
        console.error("[UI.js] createCardDOMElement: Invalid cardData received.", cardData);
        return null;
    }

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card'; // 使用 className 而不是 classList.add 以简化
    cardDiv.draggable = true;
    cardDiv.dataset.cardId = cardData.id; // 使用 cardData.id

    const img = document.createElement('img');
    // 图片路径相对于 index.html
    const imagePath = `cards/${cardData.imageName}`;
    img.src = imagePath;
    img.alt = `${cardData.displayRank}${cardData.displaySuit}`;
    img.title = img.alt;

    // console.log(`[UI.js] Attempting to set img.src for ${cardData.id} to: ${imagePath}`);

    img.onerror = function() {
        console.error(`[UI.js] FAILED TO LOAD IMAGE: ${imagePath}. For card ID: ${cardData.id}`);
        cardDiv.textContent = `${cardData.displayRank}${cardData.displaySuit} (加载失败)`;
        cardDiv.style.fontSize = "10px";
        cardDiv.style.color = "red";
        cardDiv.style.textAlign = "center";
        cardDiv.style.border = "1px solid red";
    };

    cardDiv.appendChild(img);
    return cardDiv;
}

/**
 * 将一组卡牌渲染到指定的DOM区域
 * @param {string} areaElementId - 目标区域的DOM ID
 * @param {object[]} cardsArray - 卡牌对象数组
 */
function renderCards(areaElementId, cardsArray) {
    const areaElement = getElementByIdSafe(areaElementId);
    if (!areaElement) return;

    clearElementContent(areaElementId); // 清空旧卡牌

    if (Array.isArray(cardsArray)) {
        cardsArray.forEach(cardData => {
            const cardElement = createCardDOMElement(cardData);
            if (cardElement) {
                areaElement.appendChild(cardElement);
            }
        });
        // console.log(`[UI.js] Rendered ${cardsArray.length} cards to ${areaElementId}`);
    } else {
        console.warn(`[UI.js] renderCards: cardsArray for ${areaElementId} is not an array.`, cardsArray);
    }
}

/**
 * 更新墩位牌型名称的显示
 * @param {string} dunName - 'head', 'middle', 'tail'
 * @param {string} typeName - 牌型名称, e.g., '一对' or '-'
 */
function updateDunTypeHTML(dunName, typeName) {
    const element = getElementByIdSafe(`${dunName}DunType`);
    if (element) {
        element.textContent = `(${typeName || '-'})`;
    }
}

/**
 * 显示消息/错误
 * @param {string} elementId
 * @param {string} message
 * @param {boolean} isError
 */
function displayMessage(elementId, message, isError = false) {
    const element = getElementByIdSafe(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = message ? 'block' : 'none';
        element.className = isError ? 'message error-message' : 'message info-message'; // 需要CSS支持
    }
}

/**
 * 更新AI玩家状态显示
 * @param {number} aiIndex - 0, 1, or 2
 * @param {string} statusText
 */
function updateAIStatusHTML(aiIndex, statusText) {
    const element = getElementByIdSafe(`aiPlayer${aiIndex}Info`);
    if (element) {
        // 假设HTML结构是 "AI N (状态)"
        const baseText = element.textContent.split('(')[0].trim();
        element.textContent = `${baseText} (${statusText})`;
    }
}
