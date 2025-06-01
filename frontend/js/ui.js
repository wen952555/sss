// frontend/js/ui.js
const cardImagePath = './cards/';

export function createCardElement(cardData) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    // cardData 应该包含 id, value, suit, rank, imageName, displayValue, displaySuit
    cardDiv.dataset.cardId = cardData.id;
    cardDiv.dataset.value = cardData.value;
    cardDiv.dataset.suit = cardData.suit;
    cardDiv.dataset.rank = cardData.rank;
    cardDiv.draggable = true;

    const img = document.createElement('img');
    img.src = `${cardImagePath}${cardData.imageName}`;
    img.alt = `${cardData.displayValue} of ${cardData.suit}`;
    img.onerror = () => {
        console.error(`图片加载失败: ${img.src}`);
        cardDiv.innerHTML = `<span style="font-size:10px; text-align:center; display:block; padding-top:10px;">${cardData.displayValue}${cardData.displaySuit}<br>(图片丢失)</span>`;
    };
    cardDiv.appendChild(img);
    return cardDiv;
}

export function displayCards(cardsDataArray, containerElement) {
    containerElement.innerHTML = '';
    cardsDataArray.forEach(cardData => {
        const cardElement = createCardElement(cardData);
        containerElement.appendChild(cardElement);
    });
}

export function updateStatusMessage(message, type = 'info', statusElement) {
    statusElement.textContent = message;
    statusElement.className = 'status';
    if (type === 'success') {
        statusElement.classList.add('success');
    } else if (type === 'error') {
        statusElement.classList.add('error');
    }
}

export function clearHandContainers(containerElementsArray) {
    containerElementsArray.forEach(container => container.innerHTML = '');
}

export function toggleButtonVisibility(buttonElement, show) {
    if (buttonElement) { // 添加检查，以防按钮不存在
        buttonElement.style.display = show ? 'inline-block' : 'none';
    }
}

export function setButtonText(buttonElement, text) {
     if (buttonElement) buttonElement.textContent = text;
}

export function setButtonDisabled(buttonElement, disabled) {
    if (buttonElement) buttonElement.disabled = disabled;
}

/**
 * 更新指定牌道评估结果的显示
 * @param {string} handName - 'front', 'middle', or 'back'
 * @param {string} evalText - 要显示的文本，例如牌型名称
 * @param {boolean} isError - 是否是错误状态（例如倒水）
 */
export function updateHandEvaluationDisplay(handName, evalText, isError = false) {
    const evalElement = document.getElementById(`${handName}-hand-eval`);
    if (evalElement) {
        evalElement.textContent = evalText || ''; // 如果evalText是null或undefined，则显示空
        if (isError) {
            evalElement.classList.add('error');
        } else {
            evalElement.classList.remove('error');
        }
    }
}

/**
 * 清除所有牌道评估结果的显示
 */
export function clearAllHandEvaluationDisplays() {
    updateHandEvaluationDisplay('front', '');
    updateHandEvaluationDisplay('middle', '');
    updateHandEvaluationDisplay('back', '');
}
