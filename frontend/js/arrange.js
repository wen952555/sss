// frontend/js/arrange.js
import { showGameMessage } from './ui.js'; // 使用新的ui.js
import { createCardImageElement } from './card.js';
import { configureButton } from './ui.js'; // 引入新的按钮配置函数


let fullHandData = []; // 存储13张牌的完整数据 {rank, suit, id, element, selected, pileName}
let piles = {
    head: [],
    middle: [],
    tail: []
};
const pileLimits = { head: 3, middle: 5, tail: 5 };

const unassignedCardsContainer = document.getElementById('unassignedCardsArea'); // 新的未分配牌区域
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

export function initializeArrangement(handCards) {
    fullHandData = handCards.map((card, index) => ({
        ...card,
        id: `card-${index}-${Date.now()}`,
        element: null,
        selected: false,
        pileName: null
    }));
    piles = { head: [], middle: [], tail: [] };

    renderUnassignedCards();
    renderAllPiles();
    updateAllPileCounts();
    checkArrangementCompletion();
    showGameMessage("点击上方卡牌选择，再点击目标墩放置。");
}

function renderUnassignedCards() {
    unassignedCardsContainer.innerHTML = ''; // 清空
    const unassignedCards = fullHandData.filter(cardData => !cardData.pileName);

    if (unassignedCards.length === 0 && fullHandData.length > 0) { // 意味着所有牌都已分配
        // 可以显示一个提示，或者什么都不做
        const allAssignedText = document.createElement('div');
        allAssignedText.textContent = "所有牌已分配到墩中。";
        allAssignedText.style.color = "#6c757d";
        unassignedCardsContainer.appendChild(allAssignedText);
    } else if (unassignedCards.length === 0 && fullHandData.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder-text';
        placeholder.textContent = '等待发牌...';
        unassignedCardsContainer.appendChild(placeholder);
    } else {
        unassignedCards.forEach(cardData => {
            const cardElement = createCardImageElement(cardData);
            cardElement.dataset.cardId = cardData.id;
            cardData.element = cardElement; // 保存元素引用
            cardElement.classList.add('selectable-card');
            if (cardData.selected) {
                cardElement.classList.add('selected');
            }
            cardElement.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止事件冒泡到外层（如果unassignedCardsContainer也有事件）
                handleCardSelection(cardData.id);
            });
            unassignedCardsContainer.appendChild(cardElement);
        });
    }
}

function renderPile(pileName) {
    const container = pileElements[pileName];
    container.innerHTML = '';
    piles[pileName].forEach(cardData => {
        const cardElement = createCardImageElement(cardData);
        cardElement.classList.add('pile-card');
        cardElement.dataset.cardId = cardData.id;

        const removeBtn = document.createElement('span');
        removeBtn.textContent = '×';
        removeBtn.classList.add('remove-card-btn');
        removeBtn.title = '从墩中移除';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
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
    pileCountElements[pileName].textContent = `${piles[pileName].length}/${pileLimits[pileName]}`;
}
function updateAllPileCounts() {
    for (const pileName in piles) {
        updatePileCount(pileName);
    }
}

function handleCardSelection(cardId) {
    const cardData = fullHandData.find(c => c.id === cardId);
    if (!cardData || cardData.pileName) return;

    // 单选模式
    fullHandData.forEach(c => {
        if (c.id !== cardId && c.selected && !c.pileName) { // 只取消未分配牌区的其他选中
            c.selected = false;
            if(c.element) c.element.classList.remove('selected');
        }
    });

    cardData.selected = !cardData.selected;
    if (cardData.element) {
        cardData.element.classList.toggle('selected', cardData.selected);
    }
    if(cardData.selected) {
        showGameMessage(`已选择 ${cardData.element.alt}，请点击目标墩。`);
    } else {
        showGameMessage("已取消选择。");
    }
}

export function addSelectedCardToPile(targetPileName) {
    const selectedCard = fullHandData.find(c => c.selected && !c.pileName);
    if (!selectedCard) {
        showGameMessage("请先从上方选择一张牌。");
        return;
    }

    if (piles[targetPileName].length >= pileLimits[targetPileName]) {
        showGameMessage(`${targetPileName.charAt(0).toUpperCase() + targetPileName.slice(1)}墩已满。`);
        return;
    }

    selectedCard.pileName = targetPileName;
    selectedCard.selected = false; // 移入后取消选中状态

    piles[targetPileName].push(selectedCard);

    renderUnassignedCards(); // 更新未分配牌区
    renderPile(targetPileName);
    updatePileCount(targetPileName);
    checkArrangementCompletion();
    showGameMessage(`${selectedCard.element.alt} 已放入 ${targetPileName}墩。`);
}

function removeCardFromPile(pileName, cardId) {
    const cardIndexInPile = piles[pileName].findIndex(c => c.id === cardId);
    if (cardIndexInPile === -1) return;

    const cardData = piles[pileName].splice(cardIndexInPile, 1)[0];
    const cardAltText = cardData.element ? cardData.element.alt : `${cardData.suit} ${cardData.rank}`;

    cardData.pileName = null;
    cardData.selected = false; // 移回后不保持选中

    renderUnassignedCards();
    renderPile(pileName);
    updatePileCount(pileName);
    checkArrangementCompletion();
    showGameMessage(`${cardAltText} 已从 ${pileName}墩 移回。`);
}

export function resetArrangement() {
    if (fullHandData.length === 0) {
        showGameMessage("请先发牌。");
        return;
    }
    fullHandData.forEach(card => {
        card.pileName = null;
        card.selected = false;
    });
    piles = { head: [], middle: [], tail: [] };
    renderUnassignedCards();
    renderAllPiles();
    updateAllPileCounts();
    checkArrangementCompletion();
    showGameMessage("理牌已重置。");
}

export function checkArrangementCompletion() {
    const headFull = piles.head.length === pileLimits.head;
    const middleFull = piles.middle.length === pileLimits.middle;
    const tailFull = piles.tail.length === pileLimits.tail;
    const allCardsAssigned = fullHandData.every(card => card.pileName !== null);

    const canSubmit = headFull && middleFull && tailFull && allCardsAssigned;
    // document.getElementById('submitArrangementBtn').style.display = canSubmit ? 'inline-block' : 'none'; // 改用 configureButton
    configureButton('submitArrangementBtn', { show: canSubmit, enable: canSubmit });
    return canSubmit;
}

export function getArrangedPilesData() {
    if (!checkArrangementCompletion()) {
        showGameMessage("牌型未完成或数量不符！");
        return null;
    }
    return {
        head: piles.head.map(c => ({ rank: c.rank, suit: c.suit })),
        middle: piles.middle.map(c => ({ rank: c.rank, suit: c.suit })),
        tail: piles.tail.map(c => ({ rank: c.rank, suit: c.suit }))
    };
}

export function setupPileClickHandlers() {
    document.getElementById('headPileArea').addEventListener('click', () => addSelectedCardToPile('head'));
    document.getElementById('middlePileArea').addEventListener('click', () => addSelectedCardToPile('middle'));
    document.getElementById('tailPileArea').addEventListener('click', () => addSelectedCardToPile('tail'));
}

export function clearBoardForNewGame() {
    fullHandData = [];
    piles = { head: [], middle: [], tail: [] };
    renderUnassignedCards(); // 会显示 "等待发牌..."
    renderAllPiles();
    updateAllPileCounts();
    checkArrangementCompletion(); // 会隐藏提交按钮
}
