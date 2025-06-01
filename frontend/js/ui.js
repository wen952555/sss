// frontend/js/ui.js

// (依赖 card_defs.js 中的常量，如 SUIT_SYMBOLS, RANK_DISPLAY)

/**
 * 安全地获取DOM元素
 * @param {string} id - 元素的ID
 * @returns {HTMLElement|null}
 */
function getElem(id) {
    const elem = document.getElementById(id);
    if (!elem) {
        console.warn(`[UI.js] Element with ID '${id}' not found.`);
    }
    return elem;
}

/**
 * 清空一个DOM元素的内容
 * @param {string|HTMLElement} elementOrId
 */
function clearElement(elementOrId) {
    const element = typeof elementOrId === 'string' ? getElem(elementOrId) : elementOrId;
    if (element) {
        element.innerHTML = '';
    }
}

/**
 * 创建卡牌的DOM元素
 * @param {object} cardObject - 卡牌对象 (来自 card_defs.js/createCardObject)
 *                                 需要包含 imageName, displayRank, suitSymbol, id
 * @returns {HTMLDivElement}
 */
function createCardElement(cardObject) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    cardDiv.draggable = true;
    cardDiv.dataset.cardId = cardObject.id; // 使用卡牌对象中的唯一ID

    const img = document.createElement('img');
    // 假设SVG图片在 'assets/cards/' 目录下
    // cardObject.imageName 应该已经是 'ace_of_spades.svg' 这样的格式
    img.src = `assets/cards/${cardObject.imageName}`;
    img.alt = `${cardObject.displayRank}${cardObject.suitSymbol}`;
    img.title = img.alt; // 鼠标悬浮提示

    cardDiv.appendChild(img);
    return cardDiv;
}

/**
 * 渲染指定区域的卡牌 (手牌区或墩位)
 * @param {string} areaId - 目标区域的DOM ID (e.g., 'myHandDisplay', 'headDun')
 * @param {object[]} cards - 要渲染的卡牌对象数组
 */
function renderCardsToArea(areaId, cards) {
    const areaElement = getElem(areaId);
    if (!areaElement) return;
    clearElement(areaElement); // 先清空
    if (cards && Array.isArray(cards)) {
        cards.forEach(cardObj => {
            if (cardObj) { // 确保卡牌对象有效
                const cardElement = createCardElement(cardObj);
                areaElement.appendChild(cardElement);
            }
        });
    }
}

/**
 * 更新墩位牌型显示
 * @param {string} dunName - 'head', 'middle', 'tail'
 * @param {object|null} handEvaluation - 牌型评估结果 (包含 name 属性) 或 null
 */
function updateDunTypeDisplay(dunName, handEvaluation) {
    const dunTypeElement = getElem(`${dunName}DunType`);
    if (dunTypeElement) {
        if (handEvaluation && handEvaluation.name) {
            dunTypeElement.textContent = `(${handEvaluation.name})`;
        } else {
            dunTypeElement.textContent = '(-)';
        }
    }
}

/**
 * 显示或隐藏错误/消息
 * @param {string} elementId
 * @param {string} message
 * @param {boolean} isError
 */
function showFeedbackMessage(elementId, message, isError = false) {
    const feedbackElement = getElem(elementId);
    if (feedbackElement) {
        feedbackElement.textContent = message;
        feedbackElement.style.display = message ? 'block' : 'none';
        if (isError) {
            feedbackElement.classList.add('error-message'); // 假设CSS中有这个类
            feedbackElement.classList.remove('success-message', 'info-message');
        } else {
            feedbackElement.classList.remove('error-message');
            // 可以根据需要添加 'success-message' 或 'info-message'
        }
    }
}

/**
 * 更新AI玩家状态显示
 * @param {number} aiIndex - AI的索引 (0, 1, 2)
 * @param {string} statusText - 要显示的状态文本
 */
function updateAIPlayerStatus(aiIndex, statusText) {
    const aiStatusElement = getElem(`aiPlayer${aiIndex}Info`);
    if (aiStatusElement) {
        // 假设AI的名称是固定的，只更新状态部分
        const aiName = aiStatusElement.textContent.split('(')[0].trim(); // "AI 1"
        aiStatusElement.textContent = `${aiName} (${statusText})`;
    }
}

/**
 * 显示游戏结算结果
 * @param {string} resultText - 要显示的结算文本
 */
function displayGameResults(resultText) {
    const resultArea = getElem('gameResultArea');
    const resultDetails = getElem('resultDetails');
    if (resultArea && resultDetails) {
        resultDetails.innerHTML = resultText; // 可以是HTML字符串
        resultArea.style.display = 'block';
    }
}

/**
 * 隐藏游戏结算结果
 */
function hideGameResults() {
    const resultArea = getElem('gameResultArea');
    if (resultArea) {
        resultArea.style.display = 'none';
    }
}
