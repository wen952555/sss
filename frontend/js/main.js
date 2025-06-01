// frontend/js/main.js (适配CSS伪元素文字)

// ... (全局变量和 cacheDOMElements 不变) ...
// 确保 cacheDOMElements 获取了 headDunEl, tailDunEl, myHandDisplayEl, centralAreaTitleEl

function startNewGame(triggeredBy = "Unknown") {
    // ... (大部分清理和发牌逻辑不变) ...
    console.log(`[Main.js] startNewGame CALLED (Count: ${startGameCallCount}, Trigger: ${triggeredBy}).`);

    // 1. 清理UI和重置游戏状态
    // ... (重置 humanPlayerHand, playerArrangement, etc.)
    clearElementContent('myHandDisplay');
    clearElementContent('headDun');
    clearElementContent('tailDun');

    // 更新 data 属性以供CSS伪元素使用
    if (headDunEl) { headDunEl.dataset.dunLabel = "头墩 (3张)"; headDunEl.dataset.dunType = "(-)"; }
    if (tailDunEl) { tailDunEl.dataset.dunLabel = "尾墩 (5张)"; tailDunEl.dataset.dunType = "(-)"; }
    if (myHandDisplayEl) {
        myHandDisplayEl.dataset.dunLabel = "你的手牌"; // 初始标签
        myHandDisplayEl.dataset.cardsCount = "13"; // 初始牌数
        myHandDisplayEl.dataset.dunType = "(-)";
        myHandDisplayEl.classList.remove('is-middle-dun-target');
        myHandDisplayEl.dataset.isMiddleDun = 'false'; // 确保JS状态也同步
    }
    // 移除或隐藏旧的外部标题 (如果HTML中还保留了h3/h4)
    if(centralAreaTitleEl) centralAreaTitleEl.style.display = 'none'; // 或者完全移除H3
    // getElementByIdSafe('headDunType').parentElement.style.display = 'none'; // 隐藏老的H4


    if (arrangementErrorEl) displayMessage('arrangementError', '');
    if (gameResultAreaEl) gameResultAreaEl.style.display = 'none';
    if (submitArrangementBtn) submitArrangementBtn.disabled = false;

    // 2. 发牌 (不变)
    // ...
    humanPlayerHand = allHands[0];
    // ...
    if (myHandDisplayEl) myHandDisplayEl.dataset.cardsCount = humanPlayerHand.length; // 更新手牌区牌数
    renderCards('myHandDisplay', humanPlayerHand);

    // 3. AI 摆牌 (不变)
    // ...

    // 初始更新一次墩牌型显示 (现在是更新data属性)
    if(typeof updateUIDunTypes === 'function') updateUIDunTypes();
    console.log("[Main.js] New game fully initialized.");
}


function checkAndTransitionToMiddleDun() {
    if (!myHandDisplayEl) return; // 确保元素存在
    const headFull = playerArrangement.head.length === 3;
    const tailFull = playerArrangement.tail.length === 5;
    const currentIsMiddle = myHandDisplayEl.dataset.isMiddleDun === 'true';

    if (headFull && tailFull) {
        playerArrangement.middle = [...humanPlayerHand]; // 同步逻辑中墩
        if (!currentIsMiddle) {
            console.log("[Main.js] Transitioning hand display to MIDDLE DUN.");
            myHandDisplayEl.dataset.isMiddleDun = 'true';
            myHandDisplayEl.dataset.dunLabel = "中墩"; // 更新标签
            myHandDisplayEl.classList.add('is-middle-dun-target');
        }
        myHandDisplayEl.dataset.cardsCount = playerArrangement.middle.length; // 更新中墩牌数
    } else {
        if (currentIsMiddle) {
            console.log("[Main.js] Transitioning middle dun back to HAND DISPLAY.");
            myHandDisplayEl.dataset.isMiddleDun = 'false';
            myHandDisplayEl.classList.remove('is-middle-dun-target');
        }
        playerArrangement.middle = [];
        myHandDisplayEl.dataset.dunLabel = "你的手牌"; // 恢复标签
        myHandDisplayEl.dataset.cardsCount = humanPlayerHand.length; // 更新手牌数
    }
    // 牌型更新会在 updateUIDunTypes 中处理
}

function renderAllAreas() {
    // ... (不变，它会调用 renderCards 和 updateUIDunTypes) ...
    if (myHandDisplayEl) myHandDisplayEl.dataset.cardsCount = humanPlayerHand.length; // 拖拽后更新手牌区计数
    renderCards('myHandDisplay', humanPlayerHand);
    renderCards('headDun', playerArrangement.head);
    renderCards('tailDun', playerArrangement.tail);
    if (typeof updateUIDunTypes === 'function') updateUIDunTypes(); else console.error("updateUIDunTypes not func");
}

function updateUIDunTypes() {
    if (typeof evaluatePokerHand !== 'function') { /* ... error ... */ return; }
    // console.log("[Main.js] Updating UI Dun Types (data attributes)...");

    const headEval = playerArrangement.head.length === 3 ? evaluatePokerHand(playerArrangement.head) : null;
    if (headDunEl) headDunEl.dataset.dunType = `(${(headEval && headEval.name) ? headEval.name : '-'})`;

    const tailEval = playerArrangement.tail.length === 5 ? evaluatePokerHand(playerArrangement.tail) : null;
    if (tailDunEl) tailDunEl.dataset.dunType = `(${(tailEval && tailEval.name) ? tailEval.name : '-'})`;

    if (myHandDisplayEl && myHandDisplayEl.dataset.isMiddleDun === 'true') {
        const middleEval = playerArrangement.middle.length === 5 ? evaluatePokerHand(playerArrangement.middle) : null;
        myHandDisplayEl.dataset.dunType = `(${(middleEval && middleEval.name) ? middleEval.name : '-'})`;
        myHandDisplayEl.dataset.dunLabel = "中墩"; // 确保标签正确
        myHandDisplayEl.dataset.cardsCount = playerArrangement.middle.length;
    } else if (myHandDisplayEl) { // 是手牌区
        myHandDisplayEl.dataset.dunType = "(-)"; // 手牌区通常不显示整体牌型
        myHandDisplayEl.dataset.dunLabel = "你的手牌";
        myHandDisplayEl.dataset.cardsCount = humanPlayerHand.length;
    }
    // console.log("[Main.js] UI Dun Types (data attributes) updated.");
}


// ... (handleSubmitArrangement, setupDragDrop, findCardByIdInPlay, moveCardBetweenAreas 等函数保持不变或只需微调与新 data-* 属性的交互)
// ... (DOMContentLoaded 初始化逻辑不变)
// 确保 handleSubmitArrangement 使用的是 playerArrangement.middle
function handleSubmitArrangement() { /* ... */ }
document.addEventListener('DOMContentLoaded', () => { /* ... */ });
