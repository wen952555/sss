// frontend/js/main.js (调试 New Game Button)
console.log("[Main.js] Loaded - New Layout Version");

// (依赖 card_defs.js, ui.js, game_logic.js)

// --- 全局状态 ---
let humanPlayerHand = [];
let playerArrangement = { head: [], middle: [], tail: [] };
let aiPlayersHands = [[], [], []];
let aiPlayerArrangements = [null, null, null];
let currentDraggedCardData = null;
let currentDragSourceArea = null;

// --- DOM Element References (在 DOMContentLoaded 中赋值) ---
let myHandDisplayEl, headDunEl, tailDunEl, centralAreaTitleEl;
let headDunTypeEl, tailDunTypeEl;
let submitArrangementBtn, newGameBtn; // <--- 关注 newGameBtn
let arrangementErrorEl, gameResultAreaEl, resultDetailsEl;
let aiPlayerInfoEls = [];

function cacheDOMElements() {
    console.log("[Main.js] cacheDOMElements START");
    myHandDisplayEl = getElementByIdSafe('myHandDisplay');
    headDunEl = getElementByIdSafe('headDun');
    tailDunEl = getElementByIdSafe('tailDun');
    centralAreaTitleEl = getElementByIdSafe('centralAreaTitle');

    headDunTypeEl = getElementByIdSafe('headDunType');
    tailDunTypeEl = getElementByIdSafe('tailDunType');

    submitArrangementBtn = getElementByIdSafe('submitArrangementButton');
    newGameBtn = getElementByIdSafe('newGameButton'); // <<<--- 检查这个获取
    if (!newGameBtn) {
        console.error("[Main.js] CRITICAL: newGameButton NOT FOUND in DOM during cache!");
    } else {
        console.log("[Main.js] newGameButton FOUND in DOM during cache.");
    }


    arrangementErrorEl = getElementByIdSafe('arrangementError');
    gameResultAreaEl = getElementByIdSafe('gameResultArea');
    resultDetailsEl = getElementByIdSafe('resultDetails');
    for (let i = 0; i < 3; i++) aiPlayerInfoEls[i] = getElementByIdSafe(`aiPlayer${i}Info`);
    console.log("[Main.js] cacheDOMElements END");
}


// --- 游戏初始化和流程 ---
function startNewGame() {
    // *** 在函数最开始就加入日志 ***
    console.log("[Main.js] startNewGame CALLED. Current newGameBtn state:", newGameBtn ? "Exists" : "Not Found/Cached");
    if (newGameBtn && newGameBtn.disabled) { // 如果按钮被意外禁用
        console.warn("[Main.js] startNewGame called, but newGameButton is disabled. Re-enabling for safety, but check logic.");
        // newGameBtn.disabled = false; // 除非有明确逻辑禁用它，否则不应该在这里强制启用
    }


    if (!myHandDisplayEl) {
        console.warn("[Main.js] startNewGame: DOM elements not cached yet, attempting to cache now.");
        cacheDOMElements(); // 再次尝试缓存，以防万一
        if (!myHandDisplayEl) { // 如果还是没有，则严重错误
            console.error("[Main.js] startNewGame: CRITICAL - DOM elements STILL not cached. Aborting game start.");
            alert("错误：页面元素未能正确加载，请尝试刷新页面。");
            return;
        }
    }
    console.log("[Main.js] startNewGame: Proceeding with game initialization logic...");


    // 1. 清理UI和状态
    // ... (之前的清理逻辑，确保所有 getElementByIdSafe 调用都正确)
    clearElementContent('myHandDisplay');
    clearElementContent('headDun');
    clearElementContent('tailDun');
    updateDunTypeHTML('head', 'DunType', null);
    updateDunTypeHTML('tail', 'DunType', null);
    if (centralAreaTitleEl) {
        centralAreaTitleEl.innerHTML = '你的手牌 (拖拽摆牌):';
        centralAreaTitleEl.dataset.isMiddleDun = 'false';
        if (myHandDisplayEl) myHandDisplayEl.classList.remove('is-middle-dun-target');
    }
    if (arrangementErrorEl) displayMessage('arrangementError', '');
    if (gameResultAreaEl) gameResultAreaEl.style.display = 'none';
    if (submitArrangementBtn) submitArrangementBtn.disabled = false; // 重置提交按钮状态


    // 2. 发牌
    // ... (与之前相同的发牌逻辑)
    const deck = getShuffledDeck();
    const allHands = dealCardsToPlayers(deck, 4);
    if (allHands.length < 4 || allHands[0].length < 13) {
        if(arrangementErrorEl) displayMessage('arrangementError', '发牌失败，牌数不足！', true);
        console.error("[Main.js] Dealing cards failed in startNewGame.");
        return;
    }
    humanPlayerHand = allHands[0];
    aiPlayersHands = allHands.slice(1);
    console.log("[Main.js] Human hand dealt (new game):", humanPlayerHand.map(c=>c.id));
    renderCards('myHandDisplay', humanPlayerHand);


    // 3. AI 摆牌
    // ... (与之前相同的AI摆牌逻辑)
    aiPlayersHands.forEach((hand, index) => {
        const arrangement = getSimpleAIArrangement(hand);
        if (arrangement) {
            const headEval = evaluatePokerHand(arrangement.head);
            const middleEval = evaluatePokerHand(arrangement.middle);
            const tailEval = evaluatePokerHand(arrangement.tail);
            const isDaoshui = checkDaoshui(arrangement.head, arrangement.middle, arrangement.tail);
            aiPlayerArrangements[index] = { ...arrangement, headEval, middleEval, tailEval, isDaoshui };
            updateAIStatusHTML(index, isDaoshui ? "已摆牌(倒水)" : "已摆牌");
        } else { updateAIStatusHTML(index, "摆牌错误"); }
    });
    console.log("[Main.js] New game fully initialized and AI has arranged cards.");
}

// ... (拖拽逻辑 findCardByIdInPlay, moveCardBetweenAreas, checkAndTransitionToMiddleDun 不变) ...
// ... (渲染逻辑 renderAllAreas, updateUIDunTypes 不变) ...
// ... (提交逻辑 handleSubmitArrangement 不变) ...
// *** 确保这些函数都已从之前的回复中完整复制过来 ***
function setupDragDrop() { console.log("[Main.js] setupDragDrop CALLED"); /* ... */ }
function findCardByIdInPlay(cardId) { /* ... */ }
function moveCardBetweenAreas(card, fromArea, toArea) { /* ... */ }
function checkAndTransitionToMiddleDun() { /* ... */ }
function renderAllAreas() { /* ... */ }
function updateUIDunTypes() { /* ... */ }
function handleSubmitArrangement() { console.log("[Main.js] handleSubmitArrangement CALLED"); /* ... */ }


// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Main.js] DOMContentLoaded. Initializing new layout...");
    cacheDOMElements(); // 获取所有需要的DOM元素引用

    if (submitArrangementBtn) {
        console.log("[Main.js] Adding click listener to submitArrangementBtn.");
        submitArrangementBtn.addEventListener('click', handleSubmitArrangement);
    } else {
        console.warn("[Main.js] Submit button (submitArrangementButton) not found in DOM. Cannot bind event.");
    }

    if (newGameBtn) {
        console.log("[Main.js] Adding click listener to newGameBtn.");
        newGameBtn.addEventListener('click', startNewGame); // <<<--- 确保这里绑定了
    } else {
        // 这个警告会在 cacheDOMElements 中也出现一次
        console.warn("[Main.js] New Game button (newGameButton) not found in DOM. Cannot bind event.");
    }

    // 拖拽监听器设置
    if (typeof setupDragDrop === "function") {
        setupDragDrop();
    } else {
        console.error("[Main.js] setupDragDrop function is not defined!");
    }

    // 页面加载后自动开始第一局
    if (typeof startNewGame === "function") {
        startNewGame();
    } else {
        console.error("[Main.js] startNewGame function is not defined! Cannot start initial game.");
    }
});
