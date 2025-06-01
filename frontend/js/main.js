// frontend/js/main.js (完整重构版，适配新布局和纯前端试玩)
console.log("[Main.js] Loaded - Full Logic for New Layout");

// --- 依赖项检查 (假设这些JS文件已先加载并定义了全局函数) ---
if (typeof createCard !== 'function' || typeof SUITS === 'undefined' || typeof RANKS === 'undefined') {
    console.error("[Main.js] CRITICAL: card_defs.js not loaded or core definitions missing!");
}
if (typeof getElementByIdSafe !== 'function' || typeof createCardDOMElement !== 'function' || typeof renderCards !== 'function') {
    console.error("[Main.js] CRITICAL: ui.js not loaded or core UI functions missing!");
}
if (typeof getShuffledDeck !== 'function' || typeof dealCardsToPlayers !== 'function' || typeof evaluatePokerHand !== 'function' || typeof getSimpleAIArrangement !== 'function' || typeof calculateScoreAgainstAI !== 'function' || typeof checkDaoshui !== 'function') {
    console.error("[Main.js] CRITICAL: game_logic.js not loaded or core game logic functions missing!");
}


// --- 全局游戏状态变量 ---
let humanPlayerHand = []; // 存放所有未放入头墩或尾墩的牌 (Card Objects)
let playerArrangement = { // 玩家最终确认的摆牌 (Card Objects)
    head: [],
    middle: [], // 在转换后，内容会来自 humanPlayerHand
    tail: []
};
let aiPlayersHands = [[], [], []]; // 3个AI的手牌 (Card Objects)
let aiPlayerArrangements = [null, null, null]; // 3个AI的完整摆牌结果 { head, middle, tail, headEval, middleEval, tailEval, isDaoshui }

// --- 拖拽相关状态 ---
let currentDraggedCardData = null; // 当前被拖拽的卡牌对象
let currentDragSourceAreaName = null;  // 卡牌来源区域: 'handOrMiddle', 'head', 'tail'

// --- DOM Element References (在DOM加载后获取) ---
let myHandDisplayEl, headDunEl, tailDunEl; // 主要的卡牌容器
let submitArrangementBtn, newGameBtn;
let arrangementErrorEl, gameResultAreaEl, resultDetailsEl;
let aiPlayerInfoEls = []; // [aiPlayer0InfoEl, aiPlayer1InfoEl, aiPlayer2InfoEl]

let startGameCallCount = 0; // 调试用


/**
 * 缓存所有需要的DOM元素引用
 */
function cacheDOMElements() {
    console.log("[Main.js] Caching DOM elements...");
    myHandDisplayEl = getElementByIdSafe('myHandDisplay');
    headDunEl = getElementByIdSafe('headDun');
    tailDunEl = getElementByIdSafe('tailDun');
    // 注意：centralAreaTitleEl 和各墩的 DunType span 不再直接通过JS修改innerHTML,
    // 而是通过更新父容器的 data-* 属性，由CSS伪元素显示。
    // 但我们可能仍然需要 centralAreaTitleEl 来更新 data-cards-count 等。
    // centralAreaTitleEl = getElementByIdSafe('centralAreaTitle'); // HTML中已无此单独标题

    submitArrangementBtn = getElementByIdSafe('submitArrangementButton');
    newGameBtn = getElementByIdSafe('newGameButton');
    arrangementErrorEl = getElementByIdSafe('arrangementError');
    gameResultAreaEl = getElementByIdSafe('gameResultArea');
    resultDetailsEl = getElementByIdSafe('resultDetails');

    aiPlayerInfoEls = [];
    for (let i = 0; i < 3; i++) {
        aiPlayerInfoEls[i] = getElementByIdSafe(`aiPlayer${i}Info`);
    }
    console.log("[Main.js] DOM elements cached. newGameBtn found:", !!newGameBtn);
}

/**
 * 初始化或开始一局新游戏
 * @param {string} triggeredBy - 用于日志，记录调用来源
 */
function startNewGame(triggeredBy = "Unknown") {
    startGameCallCount++;
    console.log(`[Main.js] startNewGame CALLED (Count: ${startGameCallCount}, Trigger: ${triggeredBy}).`);

    if (!myHandDisplayEl) { // 确保DOM元素已获取
        console.warn("[Main.js] startNewGame: DOM elements not cached. Re-caching.");
        cacheDOMElements();
        if (!myHandDisplayEl) {
            console.error("[Main.js] CRITICAL - DOM elements still not cached. Aborting.");
            if (arrangementErrorEl) displayMessage('arrangementError', '页面元素加载错误，请刷新', true);
            return;
        }
    }

    // 1. 重置游戏状态和UI
    humanPlayerHand = [];
    playerArrangement = { head: [], middle: [], tail: [] };
    aiPlayersHands = [[], [], []];
    aiPlayerArrangements = [null, null, null];
    currentDraggedCardData = null;
    currentDragSourceArea = null;

    clearElementContent('myHandDisplay');
    clearElementContent('headDun');
    clearElementContent('tailDun');

    // 通过更新 data-* 属性来重置墩位文字 (CSS伪元素会读取这些)
    if (headDunEl) { headDunEl.dataset.dunLabel = "头墩 (3张)"; headDunEl.dataset.dunType = "(-)"; }
    if (tailDunEl) { tailDunEl.dataset.dunLabel = "尾墩 (5张)"; tailDunEl.dataset.dunType = "(-)"; }
    if (myHandDisplayEl) {
        myHandDisplayEl.dataset.dunLabel = "你的手牌";
        myHandDisplayEl.dataset.cardsCount = "13"; // 初始牌数
        myHandDisplayEl.dataset.dunType = "(-)";   // 手牌区初始不显示牌型
        myHandDisplayEl.classList.remove('is-middle-dun-target'); // 移除中墩激活样式
        myHandDisplayEl.dataset.isMiddleDun = 'false';
    }

    if (arrangementErrorEl) displayMessage('arrangementError', ''); // 清除错误消息
    if (gameResultAreaEl) gameResultAreaEl.style.display = 'none';  // 隐藏结果区
    if (submitArrangementBtn) {
        submitArrangementBtn.disabled = false; // 重置提交按钮状态
        submitArrangementBtn.textContent = "提交摆牌";
    }

    // 2. 创建牌堆并发牌
    const deck = getShuffledDeck(); // from game_logic.js
    const allHands = dealCardsToPlayers(deck, 4); // 0 for human, 1-3 for AIs

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
    renderCards('myHandDisplay', humanPlayerHand); // ui.js - 渲染手牌到手牌区
    if (myHandDisplayEl) myHandDisplayEl.dataset.cardsCount = humanPlayerHand.length; // 更新牌数

    // 3. AI 自动摆牌
    aiPlayersHands.forEach((hand, index) => {
        if (!Array.isArray(hand) || hand.length !== 13) {
            if (aiPlayerInfoEls[index]) updateAIStatusHTML(index, "手牌错误"); return;
        }
        const arrangement = getSimpleAIArrangement(hand); // from game_logic.js
        if (arrangement && arrangement.head && arrangement.middle && arrangement.tail) {
            const headEval = evaluatePokerHand(arrangement.head);
            const middleEval = evaluatePokerHand(arrangement.middle);
            const tailEval = evaluatePokerHand(arrangement.tail);
            const isDaoshui = checkDaoshui(arrangement.head, arrangement.middle, arrangement.tail);

            aiPlayerArrangements[index] = { ...arrangement, headEval, middleEval, tailEval, isDaoshui };
            if (aiPlayerInfoEls[index]) updateAIStatusHTML(index, isDaoshui ? "已摆牌(倒水)" : "已摆牌");
        } else {
            if (aiPlayerInfoEls[index]) updateAIStatusHTML(index, "摆牌错误!");
        }
    });
    console.log("[Main.js] New game fully initialized.");
}


/**
 * 设置拖拽事件监听器
 */
function setupDragDrop() {
    console.log("[Main.js] setupDragDrop CALLED");
    const droppableAreas = document.querySelectorAll('.droppable-area');

    document.addEventListener('dragstart', (event) => {
        if (event.target.classList.contains('card')) {
            currentDraggedCardData = findCardByIdInPlay(event.target.dataset.cardId);
            currentDragSourceAreaName = event.target.parentElement.dataset.dunName;
            if (currentDraggedCardData) {
                event.dataTransfer.setData('text/plain', currentDraggedCardData.id);
                event.dataTransfer.effectAllowed = 'move';
                setTimeout(() => event.target.classList.add('dragging'), 0);
            } else {
                console.warn("[Main.js] DragStart: Card data not found for ID:", event.target.dataset.cardId);
                event.preventDefault();
            }
        }
    });

    document.addEventListener('dragend', (event) => {
        if (event.target.classList.contains('card') && event.target.classList.contains('dragging')) {
            event.target.classList.remove('dragging');
        }
        currentDraggedCardData = null;
        currentDragSourceAreaName = null;
        droppableAreas.forEach(area => area.classList.remove('drag-over'));
    });

    droppableAreas.forEach(area => {
        area.addEventListener('dragover', (event) => {
            event.preventDefault();
            const targetDunName = area.dataset.dunName;
            let maxCards = parseInt(area.dataset.maxCards);
            let currentCardsInTarget = 0;

            if (targetDunName === 'head') currentCardsInTarget = playerArrangement.head.length;
            else if (targetDunName === 'tail') currentCardsInTarget = playerArrangement.tail.length;
            else if (targetDunName === 'handOrMiddle') {
                // 如果头尾已满，则手牌区/中墩区最多容纳5张
                if (myHandDisplayEl && myHandDisplayEl.dataset.isMiddleDun === 'true') {
                    maxCards = 5; // 变成中墩了
                } // else maxCards 保持HTML中data-max-cards="13"
                currentCardsInTarget = humanPlayerHand.length;
            }

            if (currentDraggedCardData && currentCardsInTarget < maxCards) {
                event.dataTransfer.dropEffect = 'move';
                area.classList.add('drag-over');
            } else {
                event.dataTransfer.dropEffect = 'none';
                area.classList.remove('drag-over');
            }
        });
        area.addEventListener('dragenter', (event) => { event.preventDefault(); area.classList.add('drag-over');});
        area.addEventListener('dragleave', (event) => { area.classList.remove('drag-over'); });
        area.addEventListener('drop', (event) => {
            event.preventDefault();
            area.classList.remove('drag-over');
            const targetDunName = area.dataset.dunName;
            const cardId = event.dataTransfer.getData('text/plain');

            if (!currentDraggedCardData || currentDraggedCardData.id !== cardId || !currentDragSourceAreaName) {
                console.warn("[Main.js] Drop event with invalid state. CardId:", cardId, "DraggedData:", currentDraggedCardData, "SourceArea:", currentDragSourceAreaName);
                return;
            }
            if (currentDragSourceAreaName !== targetDunName) {
                moveCardBetweenAreas(currentDraggedCardData, currentDragSourceAreaName, targetDunName);
            }
        });
    });
    console.log("[Main.js] Drag and drop listeners fully set up.");
}

/**
 * 在当前玩家的牌中（手牌区、头墩、尾墩）查找指定ID的卡牌对象
 */
function findCardByIdInPlay(cardId) {
    let card = humanPlayerHand.find(c => c && c.id === cardId);
    if (card) return card;
    card = playerArrangement.head.find(c => c && c.id === cardId);
    if (card) return card;
    card = playerArrangement.tail.find(c => c && c.id === cardId);
    if (card) return card;
    console.warn(`[Main.js] findCardByIdInPlay: Card '${cardId}' not found.`);
    return null;
}

/**
 * 在不同区域间移动卡牌的数据模型，并更新UI
 */
function moveCardBetweenAreas(cardToMove, fromAreaName, toAreaName) {
    console.log(`[Main.js] Moving card ${cardToMove.id} from '${fromAreaName}' to '${toAreaName}'`);
    let cardSuccessfullyMoved = false;

    // 1. 从源区域数据模型中移除
    let removedFromSource = false;
    if (fromAreaName === 'handOrMiddle') {
        const index = humanPlayerHand.findIndex(c => c.id === cardToMove.id);
        if (index > -1) { humanPlayerHand.splice(index, 1); removedFromSource = true; }
    } else if (playerArrangement[fromAreaName]) {
        const index = playerArrangement[fromAreaName].findIndex(c => c.id === cardToMove.id);
        if (index > -1) { playerArrangement[fromAreaName].splice(index, 1); removedFromSource = true; }
    }

    if (!removedFromSource) {
        console.error(`[Main.js] moveCardBetweenAreas: Card ${cardToMove.id} not found in source ${fromAreaName}.`);
        renderAllDisplayedAreas(); // 强制UI同步数据模型
        return;
    }

    // 2. 添加到目标区域数据模型
    if (toAreaName === 'head' && playerArrangement.head.length < 3) {
        playerArrangement.head.push(cardToMove); cardSuccessfullyMoved = true;
    } else if (toAreaName === 'tail' && playerArrangement.tail.length < 5) {
        playerArrangement.tail.push(cardToMove); cardSuccessfullyMoved = true;
    } else if (toAreaName === 'handOrMiddle') {
        const isTargetMiddleDun = myHandDisplayEl && myHandDisplayEl.dataset.isMiddleDun === 'true';
        const maxInHandOrMiddle = isTargetMiddleDun ? 5 : 13;
        if (humanPlayerHand.length < maxInHandOrMiddle) {
            humanPlayerHand.push(cardToMove); cardSuccessfullyMoved = true;
        }
    }

    // 3. 如果未能添加到目标墩（例如墩已满），则将其放回手牌区
    if (!cardSuccessfullyMoved) {
        console.warn(`[Main.js] Target area '${toAreaName}' for card ${cardToMove.id} was full or invalid. Returning card to hand.`);
        if (humanPlayerHand.findIndex(c => c.id === cardToMove.id) === -1 && humanPlayerHand.length < 13) {
            humanPlayerHand.push(cardToMove);
        } else if (humanPlayerHand.findIndex(c => c.id === cardToMove.id) !== -1) {
            // Card is already in hand, do nothing
        } else {
            console.error("[Main.js] CRITICAL: Could not return card to hand, hand might be unexpectedly full or card is lost.");
            // Potentially re-add to original source if this logic is complex or buggy
        }
    }

    // 4. 检查手牌区是否变成/恢复中墩状态，并更新UI
    checkAndSetMiddleDunState();
    renderAllDisplayedAreas();
    console.log(`[Main.js] Card moved. Head:${playerArrangement.head.length}, Tail:${playerArrangement.tail.length}, Hand/Mid:${humanPlayerHand.length}`);
}

/**
 * 检查并设置手牌区是否作为中墩的状态，并更新 playerArrangement.middle
 */
function checkAndSetMiddleDunState() {
    if (!myHandDisplayEl) return;
    const headIsFull = playerArrangement.head.length === 3;
    const tailIsFull = playerArrangement.tail.length === 5;
    const currentlyIsMiddle = myHandDisplayEl.dataset.isMiddleDun === 'true';

    if (headIsFull && tailIsFull) { // 条件满足，手牌区是中墩
        playerArrangement.middle = [...humanPlayerHand]; // 同步中墩数据模型
        if (playerArrangement.middle.length > 5) {
            // 理论上不应该发生，如果拖拽时的 maxCards 检查正确
            console.warn("[Main.js] Middle dun (from hand) has more than 5 cards! This should be prevented by dragover.", playerArrangement.middle);
            // playerArrangement.middle = playerArrangement.middle.slice(0, 5); // 强制截断
            // humanPlayerHand = [...playerArrangement.middle, ...humanPlayerHand.slice(5)]; // 多余的放回“手牌”逻辑会复杂
        }
        if (!currentlyIsMiddle) {
            console.log("[Main.js] Transitioning hand display to MIDDLE DUN.");
            myHandDisplayEl.dataset.isMiddleDun = 'true';
            myHandDisplayEl.classList.add('is-middle-dun-active'); // CSS hook from style.css
        }
        // 更新 data-* 属性供CSS伪元素使用
        myHandDisplayEl.dataset.dunLabel = "中墩";
        myHandDisplayEl.dataset.cardsCount = playerArrangement.middle.length; // 应为5
    } else { // 条件不满足，是手牌区
        playerArrangement.middle = []; // 清空中墩逻辑牌
        if (currentlyIsMiddle) {
            console.log("[Main.js] Transitioning middle dun back to HAND DISPLAY.");
            myHandDisplayEl.dataset.isMiddleDun = 'false';
            myHandDisplayEl.classList.remove('is-middle-dun-active');
        }
        myHandDisplayEl.dataset.dunLabel = "你的手牌";
        myHandDisplayEl.dataset.cardsCount = humanPlayerHand.length;
    }
}

/**
 * 统一渲染所有玩家可见的卡牌区域和墩型
 */
function renderAllDisplayedAreas() {
    if (typeof renderCards !== 'function' || typeof updateUIDunTypes !== 'function') {
        console.error("[Main.js] renderCards or updateUIDunTypes is not defined!"); return;
    }
    // 更新手牌区（可能已是中墩）的牌数data属性
    if (myHandDisplayEl) myHandDisplayEl.dataset.cardsCount = humanPlayerHand.length;

    renderCards('myHandDisplay', humanPlayerHand);
    renderCards('headDun', playerArrangement.head);
    renderCards('tailDun', playerArrangement.tail);
    updateUIDunTypes(); // 更新所有墩的牌型显示
}

/**
 * 更新所有墩（头、中、尾）的牌型显示（通过 data-dun-type）
 */
function updateUIDunTypes() {
    if (typeof evaluatePokerHand !== 'function') { console.error("[Main.js] evaluatePokerHand not defined!"); return; }
    // console.log("[Main.js] Updating UI Dun Types (data attributes)...");

    const headEval = playerArrangement.head.length === 3 ? evaluatePokerHand(playerArrangement.head) : null;
    if (headDunEl) headDunEl.dataset.dunType = `(${(headEval && headEval.name) ? headEval.name : '-'})`;

    const tailEval = playerArrangement.tail.length === 5 ? evaluatePokerHand(playerArrangement.tail) : null;
    if (tailDunEl) tailDunEl.dataset.dunType = `(${(tailEval && tailEval.name) ? tailEval.name : '-'})`;

    if (myHandDisplayEl && myHandDisplayEl.dataset.isMiddleDun === 'true') {
        const middleEval = playerArrangement.middle.length === 5 ? evaluatePokerHand(playerArrangement.middle) : null;
        myHandDisplayEl.dataset.dunType = `(${(middleEval && middleEval.name) ? middleEval.name : '-'})`;
    } else if (myHandDisplayEl) {
        myHandDisplayEl.dataset.dunType = `(-)`; // 手牌区不显示牌型
    }
}


/**
 * 处理提交摆牌的逻辑
 */
function handleSubmitArrangement() {
    console.log("[Main.js] handleSubmitArrangement CALLED.");
    if (typeof checkAndSetMiddleDunState === 'function') checkAndSetMiddleDunState(); // 最后确认一次中墩状态并填充 playerArrangement.middle

    const headCards = playerArrangement.head;
    const middleCards = playerArrangement.middle; // 现在从这里取中墩
    const tailCards = playerArrangement.tail;

    if (!headCards || !middleCards || !tailCards ||
        headCards.length !== 3 || middleCards.length !== 5 || tailCards.length !== 5) {
        if (arrangementErrorEl) displayMessage('arrangementError', '请将13张牌完整摆放到头(3)、中(5)、尾(5)墩。', true);
        console.warn("[Main.js] Submit validation failed: Incorrect card counts in duns.");
        return;
    }
    if (arrangementErrorEl) displayMessage('arrangementError', '');
    if (submitArrangementBtn) submitArrangementBtn.disabled = true;

    const playerSubmittedEvals = {
        headEval: evaluatePokerHand(headCards),
        middleEval: evaluatePokerHand(middleCards),
        tailEval: evaluatePokerHand(tailCards),
    };
    const playerIsDaoshui = checkDaoshui(headCards, middleCards, tailCards);

    let fullResultsText = `<b>你的牌局:</b>\n`;
    fullResultsText += `头墩: ${headCards.map(c=>c.displayRank+c.displaySuit).join(' ')} (${playerSubmittedEvals.headEval.name})\n`;
    fullResultsText += `中墩: ${middleCards.map(c=>c.displayRank+c.displaySuit).join(' ')} (${playerSubmittedEvals.middleEval.name})\n`;
    fullResultsText += `尾墩: ${tailCards.map(c=>c.displayRank+c.displaySuit).join(' ')} (${playerSubmittedEvals.tailEval.name})\n`;
    if (playerIsDaoshui) {
        fullResultsText += "<strong style='color:red;'>你倒水了! (所有墩都算输)</strong>\n\n";
    } else {
        fullResultsText += "摆牌有效。\n\n";
    }

    let totalPlayerScoreChange = 0;
    aiPlayerArrangements.forEach((aiArr, index) => {
        if (aiArr && aiArr.headEval && aiArr.middleEval && aiArr.tailEval) {
            fullResultsText += `<b>--- 对战 AI ${index + 1} ---</b>\n`;
            fullResultsText += `AI头墩: ${aiArr.head.map(c=>c.displayRank+c.displaySuit).join(' ')} (${aiArr.headEval.name})\n`;
            fullResultsText += `AI中墩: ${aiArr.middle.map(c=>c.displayRank+c.displaySuit).join(' ')} (${aiArr.middleEval.name})\n`;
            fullResultsText += `AI尾墩: ${aiArr.tail.map(c=>c.displayRank+c.displaySuit).join(' ')} (${aiArr.tailEval.name})\n`;
            if (aiArr.isDaoshui) fullResultsText += "<span style='color:orange;'>AI倒水! (所有墩都算输给玩家)</span>\n";

            // 准备用于比较的玩家完整摆牌对象
            const playerFullArrangementForCompare = {
                head: headCards, middle: middleCards, tail: tailCards,
                headEval: playerSubmittedEvals.headEval,
                middleEval: playerSubmittedEvals.middleEval,
                tailEval: playerSubmittedEvals.tailEval,
                isDaoshui: playerIsDaoshui // 传递玩家是否倒水
            };
            // AI的摆牌对象 (aiArr) 也应该包含 isDaoshui 属性
            const comparison = calculateScoreAgainstAI(playerFullArrangementForCompare, aiArr); // from game_logic.js
            totalPlayerScoreChange += comparison.playerScoreChange;
            fullResultsText += "<b>比牌详情:</b>\n" + comparison.details.join("\n") + "\n";
            fullResultsText += `<i>你从 AI ${index + 1} 赢得/输掉道数: ${comparison.playerScoreChange > 0 ? '+' : ''}${comparison.playerScoreChange}</i>\n\n`;
        } else {
            fullResultsText += `<b>--- AI ${index + 1} 数据或摆牌不完整 ---</b>\n\n`;
        }
    });

    fullResultsText += `<b>本局试玩总道数变化: ${totalPlayerScoreChange > 0 ? '+' : ''}${totalPlayerScoreChange}</b>`;

    if (typeof displayGameResults === 'function' && resultDetailsEl && gameResultAreaEl) {
        resultDetailsEl.innerHTML = fullResultsText.replace(/\n/g, '<br>');
        gameResultAreaEl.style.display = 'block';
    }
    console.log("[Main.js] Game submitted and results displayed.");
}


// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Main.js] DOMContentLoaded. Initializing Full Logic for New Layout.");
    cacheDOMElements();

    if (submitArrangementBtn) {
        console.log("[Main.js] Binding click to submitArrangementBtn.");
        submitArrangementBtn.addEventListener('click', handleSubmitArrangement);
    } else { console.warn("[Main.js] Submit button NOT FOUND for binding."); }

    if (newGameBtn) {
        console.log("[Main.js] Binding click to newGameBtn.");
        newGameBtn.addEventListener('click', function() {
            console.log("[Main.js] newGameButton CLICKED!");
            if (typeof startNewGame === "function") {
                startNewGame("Button Click");
            } else { console.error("[Main.js] startNewGame not defined on button click!"); }
        });
    } else { console.warn("[Main.js] New Game button NOT FOUND for binding."); }

    if (typeof setupDragDrop === "function") {
        setupDragDrop();
    } else { console.error("[Main.js] setupDragDrop not defined!"); }

    if (typeof startNewGame === "function") {
        console.log("[Main.js] Auto-starting first game...");
        startNewGame("DOMContentLoaded Auto-Start");
    } else { console.error("[Main.js] startNewGame not defined! Cannot auto-start."); }

    console.log("[Main.js] DOMContentLoaded END. Full Logic for New Layout.");
});
