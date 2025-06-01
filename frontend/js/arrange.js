// frontend/js/arrange.js
import { showGameMessage } from './ui.js';
import { createCardImageElement } from './card.js';

let fullHandData = []; // 存储13张牌的完整数据 {rank, suit, id, element, selected, pileName}
let piles = {
    head: [],
    middle: [],
    tail: []
};
const pileLimits = { head: 3, middle: 5, tail: 5 };

const handCardsContainer = document.getElementById('handCards');
const pileElements = {
    head: document.getElementById('headPileCards'),
    middle: document.getElementById('middlePileCards'),
    tail: document.getElementById('tailPileCards')
};
const pileCountElements = {
    head: document.getElementById('headPileCount'),
    middle: document.getElementById('middlePileCount'),
    tail: document.getElementById('tailPileCount')
};

export function initializeArrangement(handCards) { // handCards是后端发来的原始牌数据
    fullHandData = handCards.map((card, index) => ({
        ...card, // rank, suit
        id: `card-${index}-${Date.now()}`, // 唯一ID，用于精确操作
        element: null, // DOM元素引用
        selected: false,
        pileName: null // 当前所在的墩
    }));
    piles = { head: [], middle: [], tail: [] };
    renderFullHand();
    renderAllPiles();
    updateAllPileCounts();
    checkArrangementCompletion(); // 初始检查，控制提交按钮
    showGameMessage("请将手牌分配到三墩。", "info");
}

function renderFullHand() {
    handCardsContainer.innerHTML = '';
    fullHandData.filter(cardData => !cardData.pileName).forEach(cardData => {
        const cardElement = createCardImageElement(cardData);
        cardElement.dataset.cardId = cardData.id;
        cardData.element = cardElement; // 保存元素引用
        cardElement.classList.add('selectable-card');
        if (cardData.selected) {
            cardElement.classList.add('selected');
        }
        cardElement.addEventListener('click', () => handleCardSelection(cardData.id));
        handCardsContainer.appendChild(cardElement);
    });
}

function renderPile(pileName) {
    const container = pileElements[pileName];
    container.innerHTML = '';
    piles[pileName].forEach(cardData => {
        const cardElement = createCardImageElement(cardData); // cardData里有rank, suit
        cardElement.classList.add('pile-card');
        cardElement.dataset.cardId = cardData.id;

        const removeBtn = document.createElement('span');
        removeBtn.textContent = '×';
        removeBtn.classList.add('remove-card-btn');
        removeBtn.title = '从墩中移除';
        removeBtn.onclick = (e) => {
            e.stopPropagation(); // 防止触发墩的点击事件
            removeCardFromPile(pileName, cardData.id);
        };
        cardElement.appendChild(removeBtn);
        container.appendChild(cardElement);
    });
}

function renderAllPiles() {
    for (const pileName in piles) {
        renderPile(pileName);
    }
}

function updatePileCount(pileName) {
    pileCountElements[pileName].textContent = `(${piles[pileName].length}/${pileLimits[pileName]})`;
}

function updateAllPileCounts() {
    for (const pileName in piles) {
        updatePileCount(pileName);
    }
}

function handleCardSelection(cardId) {
    const cardData = fullHandData.find(c => c.id === cardId);
    if (!cardData || cardData.pileName) return; // 如果牌已在墩中，则不处理手牌区的点击

    // 单选模式：取消之前选中的，选中当前的
    fullHandData.forEach(c => {
        if (c.id !== cardId && c.selected) {
            c.selected = false;
            if(c.element) c.element.classList.remove('selected');
        }
    });

    cardData.selected = !cardData.selected;
    if (cardData.element) {
        cardData.element.classList.toggle('selected', cardData.selected);
    }
}

export function addSelectedCardToPile(targetPileName) {
    const selectedCard = fullHandData.find(c => c.selected && !c.pileName);
    if (!selectedCard) {
        showGameMessage("请先从手牌区选择一张牌。", "info");
        return;
    }

    if (piles[targetPileName].length >= pileLimits[targetPileName]) {
        showGameMessage(`${targetPileName.charAt(0).toUpperCase() + targetPileName.slice(1)}墩已满 (${pileLimits[targetPileName]}张)。`, "warning");
        return;
    }

    // 从手牌区逻辑"移除"
    selectedCard.pileName = targetPileName;
    selectedCard.selected = false; // 移入后取消选中状态

    // 添加到目标墩
    piles[targetPileName].push(selectedCard);

    // 重新渲染
    renderFullHand(); // 更新手牌区
    renderPile(targetPileName); // 更新目标墩
    updatePileCount(targetPileName);
    checkArrangementCompletion();
}

function removeCardFromPile(pileName, cardId) {
    const cardIndexInPile = piles[pileName].findIndex(c => c.id === cardId);
    if (cardIndexInPile === -1) return;

    const cardData = piles[pileName].splice(cardIndexInPile, 1)[0];

    // 标记为未分配，回到手牌区
    cardData.pileName = null;
    // cardData.selected = false; // 可选，是否保持选中状态

    renderFullHand();
    renderPile(pileName);
    updatePileCount(pileName);
    checkArrangementCompletion();
}

export function resetArrangement() {
    fullHandData.forEach(card => {
        card.pileName = null;
        card.selected = false;
    });
    piles = { head: [], middle: [], tail: [] };
    renderFullHand();
    renderAllPiles();
    updateAllPileCounts();
    checkArrangementCompletion();
    showGameMessage("理牌已重置，请重新分配。", "info");
}

export function checkArrangementCompletion() {
    const headFull = piles.head.length === pileLimits.head;
    const middleFull = piles.middle.length === pileLimits.middle;
    const tailFull = piles.tail.length === pileLimits.tail;
    const allCardsAssigned = fullHandData.every(card => card.pileName !== null);

    const canSubmit = headFull && middleFull && tailFull && allCardsAssigned;
    document.getElementById('submitArrangementBtn').style.display = canSubmit ? 'inline-block' : 'none';
    return canSubmit;
}

export function getArrangedPilesData() {
    if (!checkArrangementCompletion()) {
        showGameMessage("牌型未完成排列或不符合数量要求！", "error");
        return null;
    }
    // 返回后端需要的纯数据格式 {rank, suit}
    return {
        head: piles.head.map(c => ({ rank: c.rank, suit: c.suit })),
        middle: piles.middle.map(c => ({ rank: c.rank, suit: c.suit })),
        tail: piles.tail.map(c => ({ rank: c.rank, suit: c.suit }))
    };
}

// 在 main.js 中调用，为墩元素添加点击事件
export function setupPileClickHandlers() {
    document.getElementById('headPileArea').addEventListener('click', () => addSelectedCardToPile('head'));
    document.getElementById('middlePileArea').addEventListener('click', () => addSelectedCardToPile('middle'));
    document.getElementById('tailPileArea').addEventListener('click', () => addSelectedCardToPile('tail'));
}
