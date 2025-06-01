// frontend/js/ui.js
console.log("[UI.js] Loaded and script executing.");

// 依赖 card_defs.js

function getElementByIdSafe(id) {
    const element = document.getElementById(id);
    // if (!element) { console.warn(`[UI.js] Element with ID '${id}' not found.`); } // 这条日志可能过多
    return element;
}

function clearElementContent(elementId) {
    const element = getElementByIdSafe(elementId);
    if (element) element.innerHTML = '';
}

function createCardDOMElement(cardData) {
    if (!cardData || typeof cardData.imageName !== 'string' || cardData.imageName.trim() === '') {
        console.error("[UI.js] createCardDOMElement: Invalid cardData (missing imageName):", cardData);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'card card-error-placeholder'; // CSS for this
        errorDiv.textContent = '牌数据错误';
        return errorDiv;
    }

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.draggable = true;
    cardDiv.dataset.cardId = cardData.id;

    const img = document.createElement('img');
    const imagePath = `cards/${cardData.imageName}`; // 路径相对于 index.html
    img.src = imagePath;
    img.alt = `${cardData.displayRank}${cardData.displaySuit}`;
    img.title = img.alt;

    // console.log(`[UI.js] Setting img.src for ${cardData.id} to: ${imagePath}`);

    img.onerror = function() {
        console.error(`[UI.js] FAILED TO LOAD IMAGE: ${this.src}. For card ID: ${cardData.id}`);
        // 在卡牌div内部显示错误，而不是替换整个div内容
        this.style.display = 'none'; //隐藏损坏的图片占位符
        const errorText = document.createElement('span');
        errorText.className = 'card-image-error-text'; // CSS for this
        errorText.textContent = `${cardData.displayRank}${cardData.displaySuit} (图错)`;
        cardDiv.appendChild(errorText);
    };
    cardDiv.appendChild(img);
    return cardDiv;
}

function renderCards(areaElementId, cardsArray) {
    const areaElement = getElementByIdSafe(areaElementId);
    if (!areaElement) {
        console.error(`[UI.js] renderCards: Target area '${areaElementId}' not found.`);
        return;
    }
    clearElementContent(areaElementId);
    if (Array.isArray(cardsArray)) {
        cardsArray.forEach(cardData => {
            const cardElement = createCardDOMElement(cardData);
            if (cardElement) areaElement.appendChild(cardElement);
        });
        // console.log(`[UI.js] Rendered ${cardsArray.length} cards to ${areaElementId}`);
    }
}

function updateDunTypeHTML(dunNameKey, // 'head', 'middle', 'tail'
                           elementIdSuffix, // 'DunType'
                           handEvaluation) {
    const targetElementId = (dunNameKey === 'middle') ? 'centralAreaTitle' : `${dunNameKey}${elementIdSuffix}`;
    const element = getElementByIdSafe(targetElementId);
    const typeName = (handEvaluation && handEvaluation.name) ? handEvaluation.name : '-';

    if (element) {
        if (dunNameKey === 'middle') {
            const titleBase = element.dataset.isMiddleDun === 'true' ? `中墩 (5张)` : `你的手牌 (${window.humanPlayerHand ? window.humanPlayerHand.length : '...'}张)`;
            element.innerHTML = `${titleBase} <span class="dun-type">(${typeName})</span>`;
        } else {
            element.textContent = `(${typeName})`;
        }
    }
}

function displayMessage(elementId, message, isError = false) {
    const element = getElementByIdSafe(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = message ? 'block' : 'none';
        element.className = 'message ' + (isError ? 'error-message' : 'info-message'); // 确保 'message' 类总在
    }
}

function updateAIStatusHTML(aiIndex, statusText) {
    const element = getElementByIdSafe(`aiPlayer${aiIndex}Info`);
    if (element) {
        const baseText = element.textContent.split('(')[0].trim() || `AI ${aiIndex + 1}`;
        element.textContent = `${baseText} (${statusText})`;
    }
}
console.log("[UI.js] All definitions processed.");
