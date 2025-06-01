// frontend/js/arrange.js
import { showGameMessage, configureButton } from './ui.js';
import { createCardImageElement } from './card.js';

let fullHandData = []; // 存储13张牌的完整数据 {rank, suit, id, element, selected, currentPile}
let piles = {
    head: [],
    middle: [], // 初始时这里是手牌源
    tail: []
};
const pileLimits = { head: 3, middle: 5, tail: 5 }; // 中墩的目标是5
let gameState = 'INITIAL'; // 'INITIAL', 'ARRANGING_FROM_MIDDLE', 'ARRANGEMENT_COMPLETE'

// DOM Elements
const middlePileDOM = document.getElementById('middlePileArea');
const middlePileTitle = document.getElementById('middlePileTitle');
const pileElements = {
    head: document.getElementById('headPileCards'),
    middle: document.getElementById('middlePileCards'), // 中墩的卡牌容器
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
        currentPile: 'middle' // 所有牌初始都在中墩 (作为手牌区)
    }));

    piles = { head: [], middle: [...fullHandData], tail: [] }; // 深拷贝一份到中墩
    gameState = 'ARRANGING_FROM_MIDDLE';

    updateMiddlePileAsHandSource(true); // 设置中墩为手牌源的样式和行为
    renderAllPiles(); // 渲染所有区域
    updateAllPileCounts();
    checkTransitionToMiddlePileRole(); // 初始检查（不太可能直接完成）
    showGameMessage("请从下方“手牌区”选择牌，再点击头墩或尾墩放置。");
}

function updateMiddlePileAsHandSource(isSource) {
    if (isSource) {
        middlePileDOM.classList.add('is-hand-source');
        middlePileDOM.classList.remove('is-middle-pile');
        middlePileTitle.textContent = '手牌区';
        pileCountElements.middle.textContent = `${piles.middle.length}/${fullHandData.length}`; // 显示剩余手牌
    } else { // 转换回真正的中墩
        middlePileDOM.classList.remove('is-hand-source');
        middlePileDOM.classList.add('is-middle-pile');
        middlePileTitle.textContent = '中墩';
        pileCountElements.middle.textContent = `${piles.middle.length}/${pileLimits.middle}`; // 显示中墩容量
    }
}


function renderPile(pileName) {
    const container = pileElements[pileName];
    container.innerHTML = '';
    piles[pileName].forEach(cardData => {
        const cardElement = createCardImageElement(cardData);
        cardData.element = cardElement; // 更新/保存元素引用
        cardElement.dataset.cardId = cardData.id;

        if (pileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE') {
            // 当中墩是手牌源时，其卡牌可以被选中
            cardElement.classList.add('selectable-card');
            if (cardData.selected) {
                cardElement.classList.add('selected');
            }
            cardElement.addEventListener('click', (e) => {
                e.stopPropagation();
                handleCardSelection(cardData.id);
            });
        } else if (pileName !== 'middle' || gameState === 'ARRANGEMENT_COMPLETE') {
            // 头墩、尾墩，或已完成排列的中墩的牌，可以有移除按钮
            cardElement.classList.add('pile-card'); // 用于移除按钮的样式目标
            const removeBtn = document.createElement('span');
            removeBtn.textContent = '×';
            removeBtn.classList.add('remove-card-btn');
            removeBtn.title = '从墩中移除';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                removeCardFromPile(pileName, cardData.id);
            };
            cardElement.appendChild(removeBtn);
        }
        container.appendChild(cardElement);
    });
}

function renderAllPiles() {
    for (const pileName in piles) {
        renderPile(pileName);
    }
}

function updatePileCount(pileName) {
    let current = piles[pileName].length;
    let limit;
    if (pileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE') {
        limit = fullHandData.length; // 总牌数作为“手牌区”的“容量”
    } else {
        limit = pileLimits[pileName];
    }
    pileCountElements[pileName].textContent = `${current}/${limit}`;
}
function updateAllPileCounts() {
    for (const pileName in piles) {
        updatePileCount(pileName);
    }
}

function handleCardSelection(cardId) {
    if (gameState !== 'ARRANGING_FROM_MIDDLE') return; // 只能在特定状态下选择

    const cardData = fullHandData.find(c => c.id === cardId && c.currentPile === 'middle');
    if (!cardData) return; // 牌不在中墩(手牌区)或找不到

    // 单选模式
    fullHandData.forEach(c => {
        if (c.id !== cardId && c.selected && c.currentPile === 'middle') {
            c.selected = false;
            if(c.element) c.element.classList.remove('selected');
        }
    });

    cardData.selected = !cardData.selected;
    if (cardData.element) {
        cardData.element.classList.toggle('selected', cardData.selected);
    }
    if(cardData.selected) {
        showGameMessage(`已选择 ${cardData.element.alt}，请点击头墩或尾墩。`);
    } else {
        showGameMessage("已取消选择。");
    }
}

export function addSelectedCardToPile(targetPileName) {
    if (targetPileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE') {
        showGameMessage("不能将牌放入当前的手牌区。");
        return;
    }

    const selectedCard = fullHandData.find(c => c.selected && c.currentPile === 'middle');
    if (!selectedCard) {
        showGameMessage("请先从下方手牌区选择一张牌。");
        return;
    }

    if (piles[targetPileName].length >= pileLimits[targetPileName]) {
        showGameMessage(`${targetPileName.charAt(0).toUpperCase() + targetPileName.slice(1)}墩已满。`);
        return;
    }

    // 从中墩(手牌区)逻辑移除
    const indexInMiddle = piles.middle.findIndex(c => c.id === selectedCard.id);
    if (indexInMiddle > -1) {
        piles.middle.splice(indexInMiddle, 1);
    }

    // 更新卡牌状态
    selectedCard.currentPile = targetPileName;
    selectedCard.selected = false; // 移入后取消选中

    // 添加到目标墩
    piles[targetPileName].push(selectedCard);

    // 重新渲染
    renderPile('middle'); // 更新中墩(手牌区)
    renderPile(targetPileName); // 更新目标墩
    updateAllPileCounts();
    checkTransitionToMiddlePileRole(); // 关键：检查是否满足转换条件
    showGameMessage(`${selectedCard.element.alt} 已放入 ${targetPileName}墩。`);
}

function removeCardFromPile(sourcePileName, cardId) {
    if (gameState === 'ARRANGEMENT_COMPLETE' && sourcePileName === 'middle') {
        // 如果已完成，且想从中墩移除，需要一个机制（比如重置或允许移回手牌区）
        // 为简化，这里暂时不允许从已完成的中墩移除，鼓励用重置
        showGameMessage("牌型已确认，请重置以修改。");
        return;
    }
    if (sourcePileName === 'middle' && gameState === 'ARRANGING_FROM_MIDDLE') {
        // 不能从作为手牌源的中墩“移除到手牌源”
        return;
    }


    const cardIndexInPile = piles[sourcePileName].findIndex(c => c.id === cardId);
    if (cardIndexInPile === -1) return;

    const cardData = piles[sourcePileName].splice(cardIndexInPile, 1)[0];
    const cardAltText = cardData.element ? cardData.element.alt : `${cardData.suit} ${cardData.rank}`;

    // 牌移回中墩（手牌区）
    cardData.currentPile = 'middle';
    cardData.selected = false;
    piles.middle.push(cardData); // 放回中墩(手牌区)

    // 如果之前是完成状态，现在状态回退
    if (gameState === 'ARRANGEMENT_COMPLETE') {
        gameState = 'ARRANGING_FROM_MIDDLE';
        updateMiddlePileAsHandSource(true);
        // 可能需要禁用提交按钮，由 checkTransition... 处理
    }

    renderPile(sourcePileName); // 更新源墩
    renderPile('middle'); // 更新中墩(手牌区)
    updateAllPileCounts();
    checkTransitionToMiddlePileRole();
    showGameMessage(`${cardAltText} 已从 ${sourcePileName}墩 移回手牌区。`);
}

function checkTransitionToMiddlePileRole() {
    const headCount = piles.head.length;
    const tailCount = piles.tail.length;
    // 中墩的牌数是固定的，因为所有未分配到头尾的牌都在中墩
    const middleImplicitCount = fullHandData.length - headCount - tailCount;

    // 转换条件：头墩3张，尾墩5张，并且所有13张牌已经通过这种方式“间接”分配完毕
    // （此时中墩自动会是5张）
    if (headCount === pileLimits.head &&
        tailCount === pileLimits.tail &&
        middleImplicitCount === pileLimits.middle) { // 确保13张牌都处理了

        if (gameState !== 'ARRANGEMENT_COMPLETE') {
            gameState = 'ARRANGEMENT_COMPLETE';
            updateMiddlePileAsHandSource(false); // 中墩变回真正的中墩
            // 此时中墩里的牌就是最终的中墩牌，不需要从piles.middle里再筛选
            // 但piles.middle 在 addSelectedCardToPile 和 removeCardFromPile 中已经正确维护
            showGameMessage("牌型初步完成！中墩已确认。请检查或提交。");
            configureButton('submitArrangementBtn', { show: true, enable: true });
        }
    } else {
        // 如果不满足转换条件，确保中墩还是手牌区状态 (除非是初始状态)
        if (gameState === 'ARRANGEMENT_COMPLETE') { // 从完成状态回退
            gameState = 'ARRANGING_FROM_MIDDLE';
            updateMiddlePileAsHandSource(true);
        }
        configureButton('submitArrangementBtn', { show: false });
    }
    return gameState === 'ARRANGEMENT_COMPLETE';
}


export function resetArrangement() {
    if (fullHandData.length === 0) {
        showGameMessage("请先发牌。");
        return;
    }
    // 所有牌重置回中墩（手牌区）
    fullHandData.forEach(card => {
        card.currentPile = 'middle';
        card.selected = false;
    });
    piles = { head: [], middle: [...fullHandData], tail: [] };
    gameState = 'ARRANGING_FROM_MIDDLE';

    updateMiddlePileAsHandSource(true);
    renderAllPiles();
    updateAllPileCounts();
    checkTransitionToMiddlePileRole(); // 会隐藏提交按钮
    showGameMessage("理牌已重置。");
}

export function getArrangedPilesData() {
    if (gameState !== 'ARRANGEMENT_COMPLETE') {
        showGameMessage("牌型未完成分配或不符合转换条件！");
        return null;
    }
    // 此时 piles.head, piles.middle, piles.tail 应该已经是最终的牌
    return {
        head: piles.head.map(c => ({ rank: c.rank, suit: c.suit })),
        middle: piles.middle.map(c => ({ rank: c.rank, suit: c.suit })),
        tail: piles.tail.map(c => ({ rank: c.rank, suit: c.suit }))
    };
}

export function setupPileClickHandlers() {
    document.getElementById('headPileArea').addEventListener('click', () => addSelectedCardToPile('head'));
    // 中墩不再是直接的放置目标，它是源
    document.getElementById('tailPileArea').addEventListener('click', () => addSelectedCardToPile('tail'));
}

export function clearBoardForNewGame() {
    fullHandData = [];
    piles = { head: [], middle: [], tail: [] };
    gameState = 'INITIAL';
    updateMiddlePileAsHandSource(true); // 恢复手牌区外观
    middlePileTitle.textContent = '手牌区'; // 确保标题正确
    pileCountElements.middle.textContent = `0/${fullHandData.length}`; // 更新计数
    renderAllPiles(); // 会清空墩
    updateAllPileCounts();
    configureButton('submitArrangementBtn', { show: false });
    configureButton('resetArrangementBtn', { show: false });
}
