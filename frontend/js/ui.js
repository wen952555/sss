// frontend/js/ui.js
const cardImagePath = './cards/'; // 确保这个路径相对于 index.html 是正确的

export function createCardElement(cardData) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    // cardData 应该包含 id, value, suit, rank, imageName, displayValue, displaySuit
    // 这些数据都应该由后端提供，前端通过 initializeHandData 添加 id
    cardDiv.dataset.cardId = cardData.id;
    cardDiv.dataset.value = cardData.value;
    cardDiv.dataset.suit = cardData.suit;
    cardDiv.dataset.rank = cardData.rank;
    cardDiv.draggable = true;

    const img = document.createElement('img');
    // imageName 由后端直接提供，例如 "ace_of_spades.svg"
    img.src = `${cardImagePath}${cardData.imageName}`;
    img.alt = `${cardData.displayValue} ${cardData.suit}`; // 更简洁的alt文本
    img.onerror = () => {
        console.error(`图片加载失败: ${img.src}`);
        // 提供一个更明显的占位符
        cardDiv.innerHTML = `<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; width:100%; height:100%; background:#eee; font-size:10px; text-align:center; color:red; box-sizing:border-box; padding:5px;">${cardData.displayValue}${cardData.displaySuit}<br>(图片丢失:${cardData.imageName})</div>`;
        cardDiv.style.border = "1px dashed red"; // 标红边框
    };
    cardDiv.appendChild(img);
    return cardDiv;
}

export function displayCards(cardsDataArray, containerElement) {
    containerElement.innerHTML = ''; // 清空容器
    if (!cardsDataArray || cardsDataArray.length === 0) {
        // console.warn("displayCards called with no cards or invalid data for container:", containerElement.id);
        // 可以选择显示一条消息，例如 "没有牌可显示"
        // containerElement.textContent = "等待发牌...";
        return;
    }
    cardsDataArray.forEach(cardData => {
        if (!cardData || !cardData.imageName || !cardData.id) { // 增加对cardData的校验
            console.error("Invalid card data object:", cardData);
            return; // 跳过无效的卡片数据
        }
        const cardElement = createCardElement(cardData);
        containerElement.appendChild(cardElement);
    });
}

export function updateStatusMessage(message, type = 'info', statusElement) {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.className = 'status'; // Reset classes
    if (type) { // 只有当type明确提供时才添加class
        statusElement.classList.add(type); // 例如 'success', 'error', 'info'
    }
}

export function clearHandContainers(containerElementsArray) {
    containerElementsArray.forEach(container => {
        if (container) container.innerHTML = '';
    });
}

export function toggleButtonVisibility(buttonElement, show) {
    if (buttonElement) {
        buttonElement.style.display = show ? 'inline-block' : 'none';
    }
}

export function setButtonText(buttonElement, text) {
     if (buttonElement) buttonElement.textContent = text;
}

export function setButtonDisabled(buttonElement, disabled) {
    if (buttonElement) buttonElement.disabled = disabled;
}

export function updateHandEvaluationDisplay(handName, evalText, isError = false) {
    const evalElement = document.getElementById(`${handName}-hand-eval`);
    if (evalElement) {
        evalElement.textContent = evalText || '';
        if (isError) {
            evalElement.classList.add('error');
        } else {
            evalElement.classList.remove('error');
        }
    }
}

export function clearAllHandEvaluationDisplays() {
    updateHandEvaluationDisplay('front', '');
    updateHandEvaluationDisplay('middle', '');
    updateHandEvaluationDisplay('back', '');
}
