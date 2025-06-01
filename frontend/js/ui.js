// frontend/js/ui.js (极度简化 getElementByIdSafe)
console.log("[UI.js] Loaded - Minimal getElementByIdSafe");

/**
 * 安全地获取DOM元素 (极简版)
 * @param {string} id - 元素的ID
 * @returns {HTMLElement|null}
 */
function getElementByIdSafe(id) {
    // 直接返回，不加任何额外逻辑或日志，以排除此函数干扰
    return document.getElementById(id);
}

// --- 其他 ui.js 函数保持不变 (确保它们是之前能工作的版本) ---
// clearElementContent, createCardDOMElement, renderCards,
// updateDunTypeHTML, displayMessage, updateAIStatusHTML

function clearElementContent(elementId) {
    const element = getElementByIdSafe(elementId); // 现在会调用上面的极简版
    if (element) {
        element.innerHTML = '';
    }
}

function createCardDOMElement(cardData) {
    if (!cardData || typeof cardData.imageName !== 'string' || cardData.imageName.trim() === '') {
        // console.error("[UI.js] createCardDOMElement: Invalid or missing imageName in cardObject:", cardData);
        const errorCardDiv = document.createElement('div');
        errorCardDiv.classList.add('card', 'card-error');
        errorCardDiv.innerHTML = `<span style="font-size:9px; color:red; text-align:center;">卡牌数据<br>错误</span>`;
        return errorCardDiv;
    }
    // console.log("[UI.js] createCardDOMElement called with cardObject (imageName: '" + cardObject.imageName + "'):", JSON.parse(JSON.stringify(cardObject)));
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.draggable = true;
    cardDiv.dataset.cardId = cardData.id;
    const img = document.createElement('img');
    const imagePath = `cards/${cardData.imageName}`;
    img.src = imagePath;
    img.alt = `${cardData.displayRank}${cardData.suitSymbol}`;
    img.title = img.alt;
    // console.log("[UI.js] Attempting to load image for card " + cardData.id + ": " + imagePath);
    img.onerror = function() { /* ... */ };
    cardDiv.appendChild(img);
    return cardDiv;
}

function renderCards(areaElementId, cardsArray) {
    const areaElement = getElementByIdSafe(areaElementId);
    if (!areaElement) return;
    clearElementContent(areaElementId);
    // console.log(`[UI.js] Rendering ${cards ? cards.length : 0} cards to area '${areaId}'. First card data (if any):`, cards && cards[0] ? JSON.parse(JSON.stringify(cards[0])) : 'No cards');
    if (Array.isArray(cardsArray)) {
        cardsArray.forEach((cardObj, index) => {
            if (cardObj && typeof cardObj.rank !== 'undefined' && typeof cardObj.imageName === 'string') {
                try {
                    const cardElement = createCardDOMElement(cardObj);
                    if (cardElement) areaElement.appendChild(cardElement); // 确保元素创建成功
                } catch (e) { /* ... */ }
            } else { /* ... */ }
        });
    } else if (cardsArray) { /* ... */ }
}

function updateDunTypeHTML(dunName, elementIdSuffix, handEvaluation) {
    const dunTypeElement = getElementByIdSafe(`${dunName}${elementIdSuffix}`);
    if (dunTypeElement) { /* ... */ }
    else if (dunName === 'middle') { /* ... */ }
}

function displayMessage(elementId, message, isError = false) {
    const element = getElementByIdSafe(elementId);
    if (element) { /* ... */ }
}
function updateAIStatusHTML(aiIndex, statusText) {
    const element = getElementByIdSafe(`aiPlayer${aiIndex}Info`);
    if (element) { /* ... */ }
}
// displayGameResults 和 hideGameResults 暂时不重要
