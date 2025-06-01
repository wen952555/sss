// frontend/js/main.js

// (依赖 card_defs.js, ui.js, game_logic.js)

let playerHand = [];
let aiHands = []; // 存放3个AI的手牌
let playerArrangement = { head: [], middle: [], tail: [] }; // Card 对象
let aiArrangements = []; // 存放3个AI的摆牌结果 { head, middle, tail, headEval, ... }

let deck = [];
let draggedCardData = null; // { id, rank, suit, value, ... }
let sourceDunName = null;   // 'hand', 'head', 'middle', 'tail'

// DOM Elements
const myHandDisplay = getElem('myHandDisplay');
const headDunDisplay = getElem('headDun');
const middleDunDisplay = getElem('middleDun');
const tailDunDisplay = getElem('tailDun');
const submitButton = getElem('submitArrangementButton');
const newGameButton = getElem('newGameButton');
const arrangementErrorDisplay = getElem('arrangementError');
const gameResultArea = getElem('gameResultArea');
const resultDetailsDisplay = getElem('resultDetails');


function initializeGame() {
    console.log("Initializing new game...");
    hideGameResults();
    showFeedbackMessage('arrangementError', '');
    playerHand = [];
    aiHands = [];
    playerArrangement = { head: [], middle: [], tail: [] };
    aiArrangements = [];
    if(submitButton) submitButton.disabled = true; // 初始不可提交，直到牌摆好

    deck = createDeck();
    shuffleDeck(deck);

    const dealtHands = dealHands(deck, 4); // 0: player, 1-3: AIs
    if (dealtHands.length < 4) {
        showFeedbackMessage('arrangementError', '发牌失败，牌不够！', true);
        return;
    }
    playerHand = dealtHands[0];
    aiHands = dealtHands.slice(1);

    renderCardsToArea('myHandDisplay', playerHand);
    renderCardsToArea('headDun', []);
    renderCardsToArea('middleDun', []);
    renderCardsToArea('tailDun', []);
    updateAllDunTypeDisplays(); // 更新所有墩牌型为 '-'

    // AI 自动摆牌 (纯前端)
    aiHands.forEach((aiHand, index) => {
        const arrangement = getAIArrangement(aiHand); // game_logic.js
        if (arrangement) {
            aiArrangements[index] = arrangement;
            updateAIPlayerStatus(index, arrangement.isDaoshui ? '已出牌 (倒水!)' : '已出牌');
        } else {
            updateAIPlayerStatus(index, '摆牌错误!');
        }
    });

    if(submitButton) submitButton.disabled = false; // 允许提交
    console.log("Game initialized. Player hand:", playerHand);
}

function updateAllDunTypeDisplays() {
    updateDunTypeDisplay('head', playerArrangement.head.length === 3 ? evaluateHand(playerArrangement.head) : null);
    updateDunTypeDisplay('middle', playerArrangement.middle.length === 5 ? evaluateHand(playerArrangement.middle) : null);
    updateDunTypeDisplay('tail', playerArrangement.tail.length === 5 ? evaluateHand(playerArrangement.tail) : null);
}

// --- 拖拽逻辑 ---
function setupDragAndDropListeners() {
    const droppableAreas = document.querySelectorAll('.droppable-area');

    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('card')) {
            draggedCardData = findCardInSource(e.target.dataset.cardId);
            sourceDunName = e.target.parentElement.dataset.dunName;
            if (draggedCardData) {
                e.dataTransfer.setData('text/plain', draggedCardData.id);
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => e.target.classList.add('dragging'), 0);
            } else {
                e.preventDefault();
            }
        }
    });

    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('card')) {
            e.target.classList.remove('dragging');
        }
        draggedCardData = null;
        sourceDunName = null;
        droppableAreas.forEach(area => area.classList.remove('drag-over'));
    });

    droppableAreas.forEach(area => {
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            const targetDunName = area.dataset.dunName;
            const maxCards = parseInt(area.dataset.maxCards) || (targetDunName === 'hand' ? 13 : 0);
            const currentCardsInTarget = targetDunName === 'hand' ? playerHand.length : playerArrangement[targetDunName]?.length || 0;

            if (draggedCardData && currentCardsInTarget < maxCards) {
                e.dataTransfer.dropEffect = 'move';
                area.classList.add('drag-over');
            } else {
                e.dataTransfer.dropEffect = 'none';
                area.classList.remove('drag-over');
            }
        });
        area.addEventListener('dragenter', (e) => { e.preventDefault(); });
        area.addEventListener('dragleave', (e) => { area.classList.remove('drag-over'); });
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('drag-over');
            const targetDunName = area.dataset.dunName;
            const cardId = e.dataTransfer.getData('text/plain');
            const droppedCard = findCardInSource(cardId); // 重新查找以确保

            if (droppedCard && sourceDunName) {
                moveCard(droppedCard, sourceDunName, targetDunName);
            }
        });
    });
}

function findCardInSource(cardId) {
    let card = playerHand.find(c => c.id === cardId);
    if (card) return card;
    for (const dun in playerArrangement) {
        card = playerArrangement[dun].find(c => c.id === cardId);
        if (card) return card;
    }
    return null;
}

function moveCard(cardToMove, fromDun, toDun) {
    if (fromDun === toDun) return;

    // 从源移除
    if (fromDun === 'hand') {
        playerHand = playerHand.filter(c => c.id !== cardToMove.id);
    } else if (playerArrangement[fromDun]) {
        playerArrangement[fromDun] = playerArrangement[fromDun].filter(c => c.id !== cardToMove.id);
    }

    // 添加到目标
    const max = parseInt(getElem(`${toDun}Dun`)?.dataset.maxCards || (toDun === 'hand' ? 13 : 0));
    if (toDun === 'hand') {
        if (playerHand.length < 13) playerHand.push(cardToMove);
    } else if (playerArrangement[toDun] && playerArrangement[toDun].length < max) {
        playerArrangement[toDun].push(cardToMove);
    } else { // 目标墩满了，放回手牌
        console.warn(`Target ${toDun} is full or invalid. Returning card to hand.`);
        if (playerHand.length < 13) playerHand.push(cardToMove);
    }

    // 重新渲染
    renderCardsToArea('myHandDisplay', playerHand);
    renderCardsToArea('headDun', playerArrangement.head);
    renderCardsToArea('middleDun', playerArrangement.middle);
    renderCardsToArea('tailDun', playerArrangement.tail);
    updateAllDunTypeDisplays();
}

// --- 提交和结算 ---
function handleSubmit() {
    if (playerHand.length > 0 ||
        playerArrangement.head.length !== 3 ||
        playerArrangement.middle.length !== 5 ||
        playerArrangement.tail.length !== 5) {
        showFeedbackMessage('arrangementError', '请将13张牌完整摆放到三墩 (3-5-5)。', true);
        return;
    }
    showFeedbackMessage('arrangementError', '');
    if(submitButton) submitButton.disabled = true;

    const playerEval = {
        head: playerArrangement.head,
        middle: playerArrangement.middle,
        tail: playerArrangement.tail,
        headEval: evaluateHand(playerArrangement.head),
        middleEval: evaluateHand(playerArrangement.middle),
        tailEval: evaluateHand(playerArrangement.tail)
    };
    playerEval.isDaoshui = isDaoshui(playerEval.headEval, playerEval.middleEval, playerEval.tailEval);

    let overallResultText = `你的牌型:\n`;
    overallResultText += `头墩: ${playerEval.headEval.name}\n`;
    overallResultText += `中墩: ${playerEval.middleEval.name}\n`;
    overallResultText += `尾墩: ${playerEval.tailEval.name}\n`;
    if (playerEval.isDaoshui) {
        overallResultText += "**你倒水了！**\n\n";
    } else {
        overallResultText += "你的摆牌有效。\n\n";
    }


    // 与每个AI比较
    aiArrangements.forEach((aiArrangement, index) => {
        if (!aiArrangement) {
            overallResultText += `AI ${index + 1} 摆牌错误，无法比较。\n`;
            return;
        }
        overallResultText += `--- 对战 AI ${index + 1} (${aiArrangement.isDaoshui ? '倒水' : '有效'}) ---\n`;
        overallResultText += `AI头墩: ${aiArrangement.headEval.name}\n`;
        overallResultText += `AI中墩: ${aiArrangement.middleEval.name}\n`;
        overallResultText += `AI尾墩: ${aiArrangement.tailEval.name}\n`;

        const comparison = comparePlayerHands(playerEval, aiArrangement); // from game_logic.js
        overallResultText += "比牌详情:\n" + comparison.details.join("\n") + "\n";
        overallResultText += `你从AI ${index + 1} 赢得/输掉道数: ${comparison.player1Score}\n\n`;
    });

    displayGameResults(overallResultText.replace(/\n/g, '<br>')); // 显示结果
}


// --- 事件监听 ---
document.addEventListener('DOMContentLoaded', () => {
    if(submitButton) submitButton.addEventListener('click', handleSubmit);
    if(newGameButton) newGameButton.addEventListener('click', initializeGame);

    setupDragAndDropListeners();
    initializeGame(); // 页面加载后自动开始第一局
});
