// frontend/js/main.js (完整版，适配新布局)
console.log("[Main.js] Loaded - New Layout Version (Full Logic Attempt)");

// (依赖 card_defs.js, ui.js, game_logic.js)

// --- 全局状态 ---
let humanPlayerHand = []; // Array of Card Objects: 存放所有未放入头墩或尾墩的牌
let playerArrangement = { // Card Objects in duns
    head: [],
    middle: [], // 这个数组将在条件满足时由 humanPlayerHand 的内容填充
    tail: []
};
let aiPlayersHands = [[], [], []]; // Array of 3 AI hands (Card Objects)
let aiPlayerArrangements = [null, null, null]; // Stores AI's {head, middle, tail, evals, isDaoshui}

let currentDraggedCardData = null; // Data of the card being dragged {id, rank, suit, ...}
let currentDragSourceArea = null;  // 'handOrMiddle', 'head', or 'tail'

// --- DOM Element References ---
let myHandDisplayEl, headDunEl, tailDunEl, centralAreaTitleEl;
let headDunTypeEl, tailDunTypeEl; // 中墩牌型显示在 centralAreaTitleEl
let submitArrangementBtn, newGameBtn;
let arrangementErrorEl, gameResultAreaEl, resultDetailsEl;
let aiPlayerInfoEls = [];

let startGameCallCount = 0; // 用于调试调用次数

/**
 * 在 DOMContentLoaded 时一次性获取所有需要的DOM元素引用
 */
function cacheDOMElements() {
    console.log("[Main.js] cacheDOMElements START");
    myHandDisplayEl = getElementByIdSafe('myHandDisplay');       // from ui.js
    headDunEl = getElementByIdSafe('headDun');
    tailDunEl = getElementByIdSafe('tailDun');
    centralAreaTitleEl = getElementByIdSafe('centralAreaTitle');
    headDunTypeEl = getElementByIdSafe('headDunType');
    tailDunTypeEl = getElementByIdSafe('tailDunType');
    submitArrangementBtn = getElementByIdSafe('submitArrangementButton');
    newGameBtn = getElementByIdSafe('newGameButton');
    arrangementErrorEl = getElementByIdSafe('arrangementError');
    gameResultAreaEl = getElementByIdSafe('gameResultArea');
    resultDetailsEl = getElementByIdSafe('resultDetails');
    aiPlayerInfoEls = []; // 清空以防重复缓存
    for (let i = 0; i < 3; i++) {
        aiPlayerInfoEls[i] = getElementByIdSafe(`aiPlayer${i}Info`);
    }
    console.log("[Main.js] cacheDOMElements END. newGameBtn found:", !!newGameBtn);
}


/**
 * 初始化或开始一局新游戏
 * @param {string} triggeredBy - 用于日志，记录调用来源
 */
function startNewGame(triggeredBy = "Unknown") {
    startGameCallCount++;
    console.log(`[Main.js] startNewGame CALLED (Count: ${startGameCallCount}, Trigger: ${triggeredBy}).`);

    if (!myHandDisplayEl) { // 确保DOM元素已获取
        console.warn("[Main.js] startNewGame: DOM elements not cached. Attempting re-cache.");
        cacheDOMElements();
        if (!myHandDisplayEl) {
            console.error("[Main.js] startNewGame: CRITICAL - DOM elements still not cached. Aborting.");
            if (arrangementErrorEl && typeof displayMessage === 'function') displayMessage('arrangementError', '页面元素加载错误，请刷新', true);
            return;
        }
    }

    // 1. 清理UI和重置游戏状态
    humanPlayerHand = [];
    playerArrangement = { head: [], middle: [], tail: [] };
    aiPlayersHands = [[], [], []];
    aiPlayerArrangements = [null, null, null];
    currentDraggedCardData = null;
    currentDragSourceArea = null;

    if (typeof clearElementContent === 'function') {
        clearElementContent('myHandDisplay');
        clearElementContent('headDun');
        clearElementContent('tailDun');
    }
    if (typeof updateDunTypeHTML === 'function') {
        updateDunTypeHTML('head', 'DunType', null);
        updateDunTypeHTML('tail', 'DunType', null);
    }
    if (centralAreaTitleEl) {
        centralAreaTitleEl.innerHTML = '你的手牌 (拖拽摆牌):'; // 重置标题
        centralAreaTitleEl.dataset.isMiddleDun = 'false'; // 重置状态
        if (myHandDisplayEl) myHandDisplayEl.classList.remove('is-middle-dun-target');
    }
    if (arrangementErrorEl && typeof displayMessage === 'function') displayMessage('arrangementError', '');
    if (gameResultAreaEl) gameResultAreaEl.style.display = 'none';
    if (submitArrangementBtn) {
        submitArrangementBtn.disabled = false; // 初始时允许点击（但会被逻辑阻止直到牌摆好）
        submitArrangementBtn.textContent = "提交摆牌";
    }


    // 2. 创建牌堆并发牌
    if (typeof getShuffledDeck !== 'function' || typeof dealCardsToPlayers !== 'function') {
        console.error("[Main.js] Core game logic functions (getShuffledDeck, dealCardsToPlayers) are missing!");
        if (arrangementErrorEl) displayMessage('arrangementError', '游戏逻辑加载失败!', true);
        return;
    }
    const deck = getShuffledDeck(); // from game_logic.js
    const allHands = dealCardsToPlayers(deck, 4);

    if (!allHands || allHands.length < 4 || !allHands[0] || allHands[0].length < 13) {
        if(arrangementErrorEl) displayMessage('arrangementError', '发牌失败，牌数不足！', true);
        console.error("[Main.js] Dealing cards failed or insufficient cards.");
        return;
    }
    humanPlayerHand = allHands[0]; // 初始所有13张牌都在手牌区
    aiPlayersHands[0] = allHands[1];
    aiPlayersHands[1] = allHands[2];
    aiPlayersHands[2] = allHands[3];

    console.log("[Main.js] Human hand dealt:", humanPlayerHand.map(c => c.id));
    if (typeof renderCards === 'function') {
        renderCards('myHandDisplay', humanPlayerHand); // ui.js - 渲染手牌到手牌区
    } else { console.error("[Main.js] renderCards function is not defined!"); }


    // 3. AI 自动摆牌
    if (typeof getSimpleAIArrangement !== 'function' || typeof evaluatePokerHand !== 'function' || typeof checkDaoshui !== 'function' || typeof updateAIStatusHTML !== 'function') {
         console.error("[Main.js] AI or hand evaluation/UI update functions missing!");
         return;
    }
    aiPlayersHands.forEach((hand, index) => {
        if (!Array.isArray(hand) || hand.length !== 13) {
            console.error(`[Main.js] AI ${index+1} has invalid hand:`, hand);
            if(aiPlayerInfoEls[index]) updateAIStatusHTML(index, "手牌错误");
            return;
        }
        const arrangement = getSimpleAIArrangement(hand); // from game_logic.js
        if (arrangement && arrangement.head && arrangement.middle && arrangement.tail) {
            const headEval = evaluatePokerHand(arrangement.head);
            const middleEval = evaluatePokerHand(arrangement.middle);
            const tailEval = evaluatePokerHand(arrangement.tail);
            // 确保 checkDaoshui 的参数是牌数组，而不是评估结果
            const isDaoshui = checkDaoshui(arrangement.head, arrangement.middle, arrangement.tail);

            aiPlayerArrangements[index] = {
                head: arrangement.head, middle: arrangement.middle, tail: arrangement.tail,
                headEval, middleEval, tailEval, isDaoshui
            };
            if (aiPlayerInfoEls[index]) {
                updateAIStatusHTML(index, isDaoshui ? "已摆牌(倒水)" : "已摆牌");
            }
        } else {
            console.error(`[Main.js] AI ${index+1} failed to arrange cards. Arrangement:`, arrangement);
            if (aiPlayerInfoEls[index]) updateAIStatusHTML(index, "摆牌错误!");
        }
    });
    // 初始更新一次墩牌型显示（都应该是空的）
    if(typeof updateUIDunTypes === 'function') updateUIDunTypes();
    console.log("[Main.js] New game fully initialized.");
}

/**
 * 设置拖拽事件监听器
 */
function setupDragDrop() {
    console.log("[Main.js] setupDragDrop CALLED");
    const droppableAreas = document.querySelectorAll('.droppable-area'); // myHandDisplay, headDun, tailDun

    document.addEventListener('dragstart', (event) => {
        if (event.target.classList.contains('card')) {
            currentDraggedCardData = findCardByIdInPlay(event.target.dataset.cardId);
            currentDragSourceArea = event.target.parentElement.dataset.dunName; // 'handOrMiddle', 'head', 'tail'
            if (currentDraggedCardData) {
                event.dataTransfer.setData('text/plain', currentDraggedCardData.id);
                event.dataTransfer.effectAllowed = 'move';
                setTimeout(() => event.target.classList.add('dragging'), 0);
            } else {
                console.warn("[Main.js] DragStart: Could not find card data for ID:", event.target.dataset.cardId);
                event.preventDefault();
            }
        }
    });

    document.addEventListener('dragend', (event) => {
        if (event.target.classList.contains('card') && event.target.classList.contains('dragging')) {
            event.target.classList.remove('dragging');
        }
        currentDraggedCardData = null;
        currentDragSourceArea = null;
        droppableAreas.forEach(area => area.classList.remove('drag-over'));
    });

    droppableAreas.forEach(area => {
        area.addEventListener('dragover', (event) => {
            event.preventDefault();
            const targetDunName = area.dataset.dunName;
            let maxCards = 0;
            let currentCardsInTarget = 0;

            if (targetDunName === 'head') {
                maxCards = 3;
                currentCardsInTarget = playerArrangement.head.length;
            } else if (targetDunName === 'tail') {
                maxCards = 5;
                currentCardsInTarget = playerArrangement.tail.length;
            } else { // 'handOrMiddle'
                if (centralAreaTitleEl && centralAreaTitleEl.dataset.isMiddleDun === 'true') { // 如果已是中墩
                    maxCards = 5;
                    currentCardsInTarget = humanPlayerHand.length; // 此时 humanPlayerHand 代表中墩
                } else { // 还是手牌区
                    maxCards = 13; // 理论上不应超过13减去已在头尾墩的牌
                    currentCardsInTarget = humanPlayerHand.length;
                }
            }

            if (currentDraggedCardData && currentCardsInTarget < maxCards) {
                event.dataTransfer.dropEffect = 'move';
                area.classList.add('drag-over');
            } else {
                event.dataTransfer.dropEffect = 'none';
                area.classList.remove('drag-over'); // 确保移除
            }
        });
        area.addEventListener('dragenter', (event) => {
            event.preventDefault();
            // drag-over class 在 dragover 中处理，避免闪烁
        });
        area.addEventListener('dragleave', (event) => {
            area.classList.remove('drag-over');
        });
        area.addEventListener('drop', (event) => {
            event.preventDefault();
            area.classList.remove('drag-over');
            const targetDunName = area.dataset.dunName;
            const cardId = event.dataTransfer.getData('text/plain');
            // 确保 currentDraggedCardData 仍然是拖拽开始时设置的那个
            if (!currentDraggedCardData || currentDraggedCardData.id !== cardId) {
                console.warn("[Main.js] Drop: cardId mismatch or no dragged card data. CardId from dataTransfer:", cardId);
                // 尝试根据cardId重新查找，但更安全的是依赖currentDraggedCardData
                currentDraggedCardData = findCardByIdInPlay(cardId);
                if(!currentDraggedCardData) return; // 如果还是找不到，则放弃此次drop
            }

            if (currentDraggedCardData && currentDragSourceArea && currentDragSourceArea !== targetDunName) {
                moveCardBetweenAreas(currentDraggedCardData, currentDragSourceArea, targetDunName);
            } else if (currentDraggedCardData && currentDragSourceArea && currentDragSourceArea === targetDunName) {
                // 在同一区域内拖拽，可以用于排序 (暂不实现)
                console.log("[Main.js] Card dropped in the same area.");
            }
        });
    });
    console.log("[Main.js] Drag and drop listeners set up.");
}


function findCardByIdInPlay(cardId) {
    let card = humanPlayerHand.find(c => c && c.id === cardId);
    if (card) return card;
    card = playerArrangement.head.find(c => c && c.id === cardId);
    if (card) return card;
    // playerArrangement.middle 在转换前为空，转换后其内容来自 humanPlayerHand
    card = playerArrangement.tail.find(c => c && c.id === cardId);
    if (card) return card;
    console.warn(`[Main.js] findCardByIdInPlay: Card with ID '${cardId}' not found in any player area.`);
    return null;
}

function moveCardBetweenAreas(cardToMove, fromAreaName, toAreaName) {
    console.log(`[Main.js] Attempting to move card ${cardToMove.id} from '${fromAreaName}' to '${toAreaName}'`);

    // 1. 从源区域数据模型中移除
    let foundAndRemoved = false;
    if (fromAreaName === 'handOrMiddle') {
        const index = humanPlayerHand.findIndex(c => c.id === cardToMove.id);
        if (index > -1) {
            humanPlayerHand.splice(index, 1);
            foundAndRemoved = true;
        }
    } else if (playerArrangement[fromAreaName]) {
        const index = playerArrangement[fromAreaName].findIndex(c => c.id === cardToMove.id);
        if (index > -1) {
            playerArrangement[fromAreaName].splice(index, 1);
            foundAndRemoved = true;
        }
    }
    if (!foundAndRemoved) {
        console.error(`[Main.js] moveCardBetweenAreas: Card ${cardToMove.id} not found in source area ${fromAreaName}.`);
        renderAllAreas(); // 重新渲染以同步状态
        return;
    }

    // 2. 添加到目标区域数据模型
    let addedToTarget = false;
    if (toAreaName === 'head' && playerArrangement.head.length < 3) {
        playerArrangement.head.push(cardToMove);
        addedToTarget = true;
    } else if (toAreaName === 'tail' && playerArrangement.tail.length < 5) {
        playerArrangement.tail.push(cardToMove);
        addedToTarget = true;
    } else if (toAreaName === 'handOrMiddle') {
        // 检查是否已成为中墩并且已满
        if (centralAreaTitleEl && centralAreaTitleEl.dataset.isMiddleDun === 'true' && humanPlayerHand.length >= 5) {
            // 中墩已满，不能再加牌
            console.warn(`[Main.js] Middle dun (handOrMiddle) is full. Cannot add card ${cardToMove.id}.`);
            // 把牌放回它原来的位置 (如果可能)，或者放回一个“未分配”状态
            // 简化：先尝试放回 humanPlayerHand，如果它也满了（理论上不应该），则出问题
            if (humanPlayerHand.length < 13) humanPlayerHand.push(cardToMove); // 尝试放回手牌
            else console.error("[Main.js] CRITICAL: handOrMiddle and target dun full, card lost state.");
        } else if (humanPlayerHand.length < 13) { // 13是手牌区的绝对上限
            humanPlayerHand.push(cardToMove);
            addedToTarget = true;
        }
    }

    if (!addedToTarget && toAreaName !== 'handOrMiddle') { // 如果目标是墩且没添加进去（满了）
        console.warn(`[Main.js] Target dun ${toAreaName} was full for card ${cardToMove.id}. Returning to hand.`);
        if (humanPlayerHand.findIndex(c => c.id === cardToMove.id) === -1) { // 避免重复
             if (humanPlayerHand.length < 13) humanPlayerHand.push(cardToMove);
        }
    }

    // 3. 检查手牌区是否变成/恢复中墩状态
    if (typeof checkAndTransitionToMiddleDun === "function") checkAndTransitionToMiddleDun();

    // 4. 重新渲染所有受影响的区域
    if (typeof renderAllAreas === "function") renderAllAreas();
    console.log(`[Main.js] Card moved. Head:${playerArrangement.head.length}, Tail:${playerArrangement.tail.length}, Hand/Mid:${humanPlayerHand.length}`);
}

function checkAndTransitionToMiddleDun() {
    if (!centralAreaTitleEl || !myHandDisplayEl) {
        console.error("[Main.js] checkAndTransitionToMiddleDun: Critical DOM elements missing.");
        return;
    }
    const headFull = playerArrangement.head.length === 3;
    const tailFull = playerArrangement.tail.length === 5;
    const isCurrentlyMiddleDun = centralAreaTitleEl.dataset.isMiddleDun === 'true';

    if (headFull && tailFull) {
        if (!isCurrentlyMiddleDun) {
            console.log("[Main.js] Transitioning hand display to MIDDLE DUN.");
            centralAreaTitleEl.dataset.isMiddleDun = 'true';
            myHandDisplayEl.classList.add('is-middle-dun-target');
        }
        // 将 humanPlayerHand 的内容（应该是剩下的5张）赋给 playerArrangement.middle
        // 确保不多于5张
        playerArrangement.middle = humanPlayerHand.slice(0, 5);
        if (humanPlayerHand.length > 5) {
            console.warn("[Main.js] More than 5 cards in hand when transitioning to middle dun. Taking first 5. Extra:", humanPlayerHand.slice(5));
            // 这种情况理论上不应发生，如果拖拽逻辑正确限制了牌数
        }
    } else {
        if (isCurrentlyMiddleDun) {
            console.log("[Main.js] Transitioning middle dun back to HAND DISPLAY.");
            centralAreaTitleEl.dataset.isMiddleDun = 'false';
            myHandDisplayEl.classList.remove('is-middle-dun-target');
        }
        playerArrangement.middle = []; // 清空中墩逻辑牌
    }
    // 标题和牌型更新在 updateUIDunTypes 中，由 renderAllAreas 调用
}

function renderAllAreas() {
    if (typeof renderCards !== 'function' || typeof updateUIDunTypes !== 'function') {
        console.error("[Main.js] renderCards or updateUIDunTypes is not defined in renderAllAreas!"); return;
    }
    renderCards('myHandDisplay', humanPlayerHand); // ui.js
    renderCards('headDun', playerArrangement.head);
    renderCards('tailDun', playerArrangement.tail);
    updateUIDunTypes();
}

function updateUIDunTypes() {
    if (typeof updateDunTypeHTML !== 'function' || typeof evaluatePokerHand !== 'function') {
        console.error("[Main.js] updateDunTypeHTML or evaluatePokerHand is not defined!"); return;
    }
    // console.log("[Main.js] Updating UI Dun Types...");

    updateDunTypeHTML('head', 'DunType', playerArrangement.head.length === 3 ? evaluatePokerHand(playerArrangement.head) : null);
    updateDunTypeHTML('tail', 'DunType', playerArrangement.tail.length === 5 ? evaluatePokerHand(playerArrangement.tail) : null);

    if (centralAreaTitleEl && centralAreaTitleEl.dataset.isMiddleDun === 'true') {
        const middleCardsForEval = playerArrangement.middle; // 使用已同步的 middle 墩
        const middleEval = middleCardsForEval.length === 5 ? evaluatePokerHand(middleCardsForEval) : null;
        // updateDunTypeHTML 的第三个参数是评估结果对象
        updateDunTypeHTML('middle', 'DunType', middleEval);
    } else if (centralAreaTitleEl) { // 如果不是中墩，清空中墩牌型显示
        centralAreaTitleEl.innerHTML = `你的手牌 (${humanPlayerHand.length}张) (拖拽摆牌):`;
        // updateDunTypeHTML('middle', 'DunType', null); // 这会尝试更新 centralAreaTitle 的 span
    }
}

function handleSubmitArrangement() {
    console.log("[Main.js] handleSubmitArrangement CALLED.");
    if (typeof checkAndTransitionToMiddleDun === 'function') checkAndTransitionToMiddleDun(); // 最后确认一次中墩状态

    const headCards = playerArrangement.head;
    const middleCards = playerArrangement.middle; // 从 playerArrangement.middle 获取
    const tailCards = playerArrangement.tail;

    if (!headCards || !middleCards || !tailCards ||
        headCards.length !== 3 || middleCards.length !== 5 || tailCards.length !== 5) {
        if (arrangementErrorEl) displayMessage('arrangementError', '请将13张牌完整摆放到头(3)、中(5)、尾(5)墩。', true);
        return;
    }
    if (arrangementErrorEl) displayMessage('arrangementError', '');
    if (submitArrangementBtn) submitArrangementBtn.disabled = true;

    const playerSubmittedEvals = {
        headEval: evaluatePokerHand(headCards),
        middleEval: evaluatePokerHand(middleCards),
        tailEval: evaluatePokerHand(tailCards),
    };
    const playerIsDaoshui = checkDaoshui(headCards, middleCards, tailCards); // 直接传牌数组

    let fullResultsText = `<b>你的牌局:</b>\n`;
    fullResultsText += `头墩: ${headCards.map(c=>c.displayRank+c.displaySuit).join(' ')} (${playerSubmittedEvals.headEval.name})\n`;
    fullResultsText += `中墩: ${middleCards.map(c=>c.displayRank+c.displaySuit).join(' ')} (${playerSubmittedEvals.middleEval.name})\n`;
    fullResultsText += `尾墩: ${tailCards.map(c=>c.displayRank+c.displaySuit).join(' ')} (${playerSubmittedEvals.tailEval.name})\n`;
    if (playerIsDaoshui) {
        fullResultsText += "<strong style='color:red;'>你倒水了!</strong>\n\n";
    } else {
        fullResultsText += "摆牌有效。\n\n";
    }

    let totalPlayerScoreChange = 0;
    aiPlayerArrangements.forEach((aiArr, index) => {
        if (aiArr && aiArr.headEval) { // 确保AI摆牌数据完整
            fullResultsText += `<b>--- 对战 AI ${index + 1} ---</b>\n`;
            fullResultsText += `AI头墩: ${aiArr.head.map(c=>c.displayRank+c.displaySuit).join(' ')} (${aiArr.headEval.name})\n`;
            fullResultsText += `AI中墩: ${aiArr.middle.map(c=>c.displayRank+c.displaySuit).join(' ')} (${aiArr.middleEval.name})\n`;
            fullResultsText += `AI尾墩: ${aiArr.tail.map(c=>c.displayRank+c.displaySuit).join(' ')} (${aiArr.tailEval.name})\n`;
            if (aiArr.isDaoshui) fullResultsText += "<span style='color:orange;'>AI倒水!</span>\n";

            // 准备用于比较的玩家完整摆牌对象
            const playerFullArrangementForCompare = {
                head: headCards, middle: middleCards, tail: tailCards, // 牌张
                headEval: playerSubmittedEvals.headEval, // 评估结果
                middleEval: playerSubmittedEvals.middleEval,
                tailEval: playerSubmittedEvals.tailEval,
                isDaoshui: playerIsDaoshui
            };

            const comparison = calculateScoreAgainstAI(playerFullArrangementForCompare, aiArr);
            totalPlayerScoreChange += comparison.playerScoreChange;
            fullResultsText += comparison.details.join("\n") + "\n";
            fullResultsText += `<i>你从 AI ${index + 1} 赢得/输掉: ${comparison.playerScoreChange > 0 ? '+' : ''}${comparison.playerScoreChange} 道</i>\n\n`;
        } else {
            fullResultsText += `<b>--- AI ${index + 1} 数据错误 ---</b>\n\n`;
        }
    });

    fullResultsText += `<b>本局总道数变化: ${totalPlayerScoreChange > 0 ? '+' : ''}${totalPlayerScoreChange}</b>`;

    if (typeof displayGameResults === 'function') displayGameResults(fullResultsText.replace(/\n/g, '<br>'));
    console.log("[Main.js] Game submitted and results displayed.");
}


// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Main.js] DOMContentLoaded. Final Version with Full Logic.");
    cacheDOMElements();

    if (submitArrangementBtn) {
        submitArrangementBtn.addEventListener('click', handleSubmitArrangement);
    }
    if (newGameBtn) {
        newGameBtn.addEventListener('click', function() { startNewGame("Button Click"); });
    }

    if (typeof setupDragDrop === "function") setupDragDrop();
    else console.error("[Main.js] setupDragDrop not defined!");

    if (typeof startNewGame === "function") {
        startNewGame("DOMContentLoaded Auto-Start");
    } else { console.error("[Main.js] startNewGame not defined! Cannot auto-start."); }

    console.log("[Main.js] DOMContentLoaded END. Final Version with Full Logic.");
});
