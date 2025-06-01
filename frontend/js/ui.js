// frontend/js/ui.js (可能不需要大改，但要确保函数对新布局仍然有效)

// ... (getElementByIdSafe, clearElementContent, createCardDOMElement 函数基本不变) ...

/**
 * 将一组卡牌渲染到指定的DOM区域
 * @param {string} areaElementId
 * @param {object[]} cardsArray
 */
function renderCards(areaElementId, cardsArray) {
    const areaElement = getElementByIdSafe(areaElementId);
    if (!areaElement) return;
    clearElementContent(areaElementId);
    if (Array.isArray(cardsArray)) {
        cardsArray.forEach(cardData => {
            const cardElement = createCardDOMElement(cardData);
            if (cardElement) {
                areaElement.appendChild(cardElement);
            }
        });
    }
}

/**
 * 更新墩位牌型名称的显示 (可以是头、中、尾)
 * @param {string} dunNameKey - 'head', 'middle', 'tail' (用于逻辑)
 * @param {string} elementIdSuffix - 'DunType' (用于构成DOM ID)
 * @param {object|null} handEvaluation - 牌型评估结果
 */
function updateDunTypeHTML(dunNameKey, elementIdSuffix, handEvaluation) {
    // 对于中墩，我们需要一个专门的显示区域，或者修改 myHandDisplay 旁边的标题
    // 这里我们假设HTML中仍然有 headDunType, tailDunType，
    // 中墩的牌型可以在 centralAreaTitle 旁边显示
    const dunTypeElement = getElementByIdSafe(`${dunNameKey}${elementIdSuffix}`); // e.g. headDunType
    if (dunTypeElement) {
        dunTypeElement.textContent = `(${(handEvaluation && handEvaluation.name) ? handEvaluation.name : '-'})`;
    } else if (dunNameKey === 'middle') { // 特殊处理中墩牌型显示
        const centralTitleEl = getElementByIdSafe('centralAreaTitle');
        if (centralTitleEl && centralTitleEl.dataset.isMiddleDun === 'true') {
            centralTitleEl.innerHTML = `中墩 (5张) <span class="dun-type">(${(handEvaluation && handEvaluation.name) ? handEvaluation.name : '-'})</span>`;
        }
    }
}

// ... (displayMessage, updateAIStatusHTML, displayGameResults, hideGameResults 不变) ...
