// frontend/js/ui.js
const cardImagePath = './cards/';
export function createCardElement(cardData) {
    const cardDiv = document.createElement('div'); cardDiv.classList.add('card');
    cardDiv.dataset.cardId = cardData.id; cardDiv.dataset.value = cardData.value;
    cardDiv.dataset.suit = cardData.suit; cardDiv.dataset.rank = cardData.rank;
    cardDiv.draggable = true;
    const img = document.createElement('img');
    img.src = `${cardImagePath}${cardData.imageName}`; img.alt = `${cardData.displayValue} ${cardData.suit}`;
    img.onerror = () => { console.error(`图片加载失败: ${img.src}`);
        cardDiv.innerHTML = `<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; width:100%; height:100%; background:#eee; font-size:10px; text-align:center; color:red; box-sizing:border-box; padding:5px;">${cardData.displayValue}${cardData.displaySuit}<br>(图片丢失:${cardData.imageName})</div>`;
        cardDiv.style.border = "1px dashed red"; };
    cardDiv.appendChild(img); return cardDiv;
}
export function displayCards(cardsDataArray, containerElement) {
    containerElement.innerHTML = ''; if (!cardsDataArray || cardsDataArray.length === 0) return;
    cardsDataArray.forEach(cardData => { if (!cardData || !cardData.imageName || !cardData.id) { console.error("Invalid card data:", cardData); return; }
        containerElement.appendChild(createCardElement(cardData)); });
}
export function updateStatusMessage(message, type = 'info', statusElement) {
    if (!statusElement) return; statusElement.textContent = message; statusElement.className = 'status';
    if (type) statusElement.classList.add(type);
}
export function clearHandContainers(els) { els.forEach(el => { if (el) el.innerHTML = ''; }); }
export function toggleButtonVisibility(el, show) { if (el) el.style.display = show ? 'inline-block' : 'none'; }
export function setButtonText(el, text) { if (el) el.textContent = text; }
export function setButtonDisabled(el, disabled) { if (el) el.disabled = disabled; }
export function updateHandEvaluationDisplay(handName, evalText, isError = false) {
    const el = document.getElementById(`${handName}-hand-eval`);
    if (el) { el.textContent = evalText || ''; el.classList.toggle('error', isError); }
}
export function clearAllHandEvaluationDisplays() {
    updateHandEvaluationDisplay('front', ''); updateHandEvaluationDisplay('middle', ''); updateHandEvaluationDisplay('back', '');
}
