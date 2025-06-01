// frontend/js/ui.js
const cardImagePath = './cards/'; // 相对于 index.html 的路径

export function createCardElement(cardData) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    cardDiv.dataset.cardId = cardData.id; // 使用唯一ID (由gameLogic或main.js在获取数据后添加)
    cardDiv.dataset.value = cardData.value;
    cardDiv.dataset.suit = cardData.suit;
    cardDiv.dataset.rank = cardData.rank; // 后端已计算
    cardDiv.draggable = true;

    const img = document.createElement('img');
    // imageName 由后端直接提供，例如 "ace_of_spades.svg"
    img.src = `${cardImagePath}${cardData.imageName}`;
    img.alt = `${cardData.displayValue} of ${cardData.suit}`; // displayValue 和 displaySuit 由后端提供
    img.onerror = () => { // 图片加载失败处理
        console.error(`图片加载失败: ${img.src}`);
        cardDiv.innerHTML = `<span style="font-size:10px; text-align:center; display:block; padding-top:10px;">${cardData.displayValue}${cardData.displaySuit}<br>(图片丢失)</span>`;
    };
    cardDiv.appendChild(img);
    return cardDiv;
}

export function displayCards(cardsDataArray, containerElement) {
    containerElement.innerHTML = ''; // 清空容器
    cardsDataArray.forEach(cardData => {
        const cardElement = createCardElement(cardData);
        containerElement.appendChild(cardElement);
    });
}

export function updateStatusMessage(message, type = 'info', statusElement) {
    statusElement.textContent = message;
    statusElement.className = 'status'; // Reset classes
    if (type === 'success') {
        statusElement.classList.add('success');
    } else if (type === 'error') {
        statusElement.classList.add('error'); // 假设你有 .error CSS class for red text
    }
    // 'info' type will just use the default .status styling
}

export function clearHandContainers(containerElementsArray) {
    containerElementsArray.forEach(container => container.innerHTML = '');
}

export function toggleButtonVisibility(buttonElement, show) {
    buttonElement.style.display = show ? 'inline-block' : 'none';
}

export function setButtonText(buttonElement, text) {
    buttonElement.textContent = text;
}

export function setButtonDisabled(buttonElement, disabled) {
    buttonElement.disabled = disabled;
}
